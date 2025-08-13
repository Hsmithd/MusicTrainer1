import re
import multiprocessing
import numpy as np
from datasets import load_dataset

OUTPUT_FILE = "melodyhub_tagged.txt"


# -------------------------
# Feature extraction
# -------------------------
def difficulty_features(abc_string):
    unique_pitches = len(set(re.findall(r"[A-Ga-g]", abc_string)))
    unique_rhythms = len(set(re.findall(r"\d+", abc_string)))
    accidentals = abc_string.count('^') + abc_string.count('_')
    ornaments = len(re.findall(r"[~HLMOPSTuv]", abc_string))
    note_count = len(re.findall(r"[A-Ga-g]", abc_string))

    tempo_match = re.search(r"Q:\s*\d+", abc_string)
    tempo = int(re.search(r"\d+", tempo_match.group()).group()) if tempo_match else 100

    return {
        "unique_pitches": unique_pitches,
        "unique_rhythms": unique_rhythms,
        "accidentals": accidentals,
        "ornaments": ornaments,
        "note_count": note_count,
        "tempo": tempo
    }


# -------------------------
# Scoring with weights
# -------------------------
def calibrated_difficulty_score(abc_string, weights):
    feats = difficulty_features(abc_string)
    tempo_factor = max(feats["tempo"] - 60, 0)

    return (
            feats["unique_pitches"] * weights["unique_pitches"] +
            feats["unique_rhythms"] * weights["unique_rhythms"] +
            feats["accidentals"] * weights["accidentals"] +
            feats["ornaments"] * weights["ornaments"] +
            feats["note_count"] * weights["note_count"] +
            tempo_factor * weights["tempo"]
    )


# -------------------------
# Auto-calibration
# -------------------------
def auto_calibrate(dataset, abc_key):
    # Initial guess for weights
    weights = {
        "unique_pitches": 1.5,
        "unique_rhythms": 1.2,
        "accidentals": 1.3,
        "ornaments": 1.5,
        "note_count": 0.01,
        "tempo": 0.02
    }

    scores = []
    for record in dataset:
        melody = str(record[abc_key]).strip()
        if melody:
            scores.append(calibrated_difficulty_score(melody, weights))

    scores = np.array(scores)
    # Pick thresholds so ~33% easy, ~33% medium, ~33% hard
    easy_thresh = np.percentile(scores, 33)
    medium_thresh = np.percentile(scores, 66)

    return weights, (easy_thresh, medium_thresh)


# -------------------------
# Difficulty tag function
# -------------------------
def get_difficulty_tag(score, thresholds):
    if score <= thresholds[0]:
        return "<difficulty=easy>"
    elif score <= thresholds[1]:
        return "<difficulty=medium>"
    else:
        return "<difficulty=hard>"


# -------------------------
# Processing function
# -------------------------
def process(record, abc_key, weights, thresholds):
    melody = str(record.get(abc_key, "")).strip()
    if not melody:
        return None
    score = calibrated_difficulty_score(melody, weights)
    tag = get_difficulty_tag(score, thresholds)
    return {"input": f"{tag} generate melody", "target": melody}


# -------------------------
# Main
# -------------------------
if __name__ == "__main__":
    print("Loading MelodyHub dataset...")
    dataset = load_dataset("sander-wood/melodyhub", split="train")
    print("Dataset loaded.")


    # Detect ABC notation column
    def find_abc_key(dataset):
        for key in dataset.column_names:
            sample_value = str(dataset[0][key]) if dataset[0][key] else ""
            if re.search(r"[A-Ga-g]", sample_value) and len(sample_value) > 20:
                return key
        raise ValueError("Could not find ABC notation column.")


    abc_key = find_abc_key(dataset)
    print(f"Detected ABC column: '{abc_key}'")

    # Calibrate
    print("Calibrating difficulty scoring...")
    weights, thresholds = auto_calibrate(dataset, abc_key)
    print(f"Selected thresholds: Easy ≤ {thresholds[0]:.2f}, Medium ≤ {thresholds[1]:.2f}, Hard > {thresholds[1]:.2f}")

    # Process with multiprocessing
    num_cores = multiprocessing.cpu_count()
    tagged = dataset.map(
        process,
        fn_kwargs={"abc_key": abc_key, "weights": weights, "thresholds": thresholds},
        remove_columns=dataset.column_names,
        num_proc=num_cores,
        desc="Tagging melodies"
    )

    # Remove None results
    tagged = tagged.filter(lambda x: x["input"] is not None)

    # Save to file
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        for row in tagged:
            f.write(f"{row['input']}\t{row['target']}\n")

    print(f"✅ Tagged {len(tagged)} melodies and saved to {OUTPUT_FILE}")
