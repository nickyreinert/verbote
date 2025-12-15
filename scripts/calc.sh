# runs scripts for (re-)calculating the data files
# usage: ./calc.sh

python scripts/check_distribution.py
python scripts/classify_topics.py
python scripts/generate_config.py
python scripts/generate_consensus.py  