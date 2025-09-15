#!/bin/bash
#SBATCH --partition=GPU
#SBATCH --time=144:00:00
#SBATCH --nodes=4
#SBATCH --cpus-per-task=2
#SBATCH --gres=gpu:3
#SBATCH --mem=50G
#SBATCH --job-name=“Mus_Train"
#SBATCH --output=Mus_Train.txt
#SBATCH --error=Mus_Train.err
#SBATCH --mail-user=SMITHHD4541@UWEC.EDU
#SBATCH --mail-type=ALL

python -m torch.distributed.launch --nproc_per_node=10 --use_env train.py