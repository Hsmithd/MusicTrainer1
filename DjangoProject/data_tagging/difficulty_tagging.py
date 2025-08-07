import re
from datasets import load_dataset

OUTPUT_FILE = "melodyhub_tagged.txt"

def difficulty_score(abc_string):
    unique_pitches = len(set(re.findall(r"[A-Ga-g]", abc_string)))
    unique_rhythms = len(set(re.findall(r"\d+", abc_string)))
    accidentals = abc_string.count('^') + abc_string.count('_')
    return unique_pitches + unique_rhythms + accidentals

def get_difficulty_tag(score):
    if score <= 6:
        return "<difficulty=easy>"
    elif score <= 12:
        return "<difficulty=medium>"
    else:
        return "<difficulty=hard>"

def tag_dataset_and_save(dataset, output_file):
    with open(output_file, "w", encoding="utf-8") as outfile:
        for i in range(len(dataset)):
            # Inspect the keys of the first record
            if i == 0:
                print("Dataset keys:", dataset[i].keys())
            try:
                # Replace 'abc' with the correct key after inspection
                melody = dataset[i]["abc_notation"]  # Example: Adjust this based on actual key
                if not melody:
                    continue
                score = difficulty_score(melody)
                tag = get_difficulty_tag(score)
                input_line = f"{tag} generate melody"
                outfile.write(f"{input_line}\t{melody.strip()}\n")
            except KeyError as e:
                print(f"KeyError at index {i}: {e}. Skipping record.")
                continue
    print(f"Tagged {len(dataset)} melodies and saved to {output_file}")

if __name__ == "__main__":
    print("Loading MelodyHub dataset from Hugging Face...")
    dataset = load_dataset("sander-wood/melodyhub", split="train")
    print("Dataset loaded. Tagging melodies...")
    tag_dataset_and_save(dataset, OUTPUT_FILE)