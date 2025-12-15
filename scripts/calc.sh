# runs scripts for (re-)calculating the data files
# usage: ./calc.sh

python3 scripts/check_distribution.py
python3 scripts/classify_topics.py
python3 scripts/generate_config.py
python3 scripts/generate_consensus.py  