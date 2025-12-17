#!/usr/bin/env python3
"""Validate generated weapon JSONs against NoteDiscovery source."""

import json
import os
import re
import subprocess

def get_source_content():
    """Fetch weapon source from NoteDiscovery."""
    result = subprocess.run(
        ['python', 'client.py', 'read', 'gaming/vagabond-rpg/gear-weapons.md'],
        cwd=os.path.expanduser('~/.claude/skills/notediscovery'),
        capture_output=True,
        text=True
    )
    data = json.loads(result.stdout)
    return data['content']

def parse_source_weapons(text):
    """Parse source weapon data into a dictionary."""
    weapons = {}

    # Find the weapons table
    lines = text.split('\n')
    in_table = False

    for line in lines:
        if '| Weapon | Damage | Grip |' in line:
            in_table = True
            continue
        if in_table and line.startswith('|---'):
            continue
        if in_table and line.startswith('|') and line.count('|') >= 7:
            parts = [p.strip() for p in line.split('|')[1:-1]]
            if len(parts) >= 7 and parts[0] != 'Weapon':
                name = parts[0]
                damage = parts[1]
                grip = parts[2]
                range_val = parts[3]
                properties = parts[4]
                value = parts[5]
                slots = parts[6]

                weapons[name.lower()] = {
                    'name': name,
                    'damage': damage,
                    'grip': grip,
                    'range': range_val,
                    'properties': properties,
                    'value': value,
                    'slots': slots
                }
        elif in_table and not line.startswith('|'):
            in_table = False

    return weapons

def parse_value_to_copper(value_str):
    """Convert value string to copper."""
    if not value_str or value_str == '-':
        return 0

    total = 0
    # Match gold
    gold_match = re.search(r'(\d+)g', value_str)
    if gold_match:
        total += int(gold_match.group(1)) * 100  # 1g = 100c (1g = 10s, 1s = 10c)

    # Match silver
    silver_match = re.search(r'(\d+)s', value_str)
    if silver_match:
        total += int(silver_match.group(1)) * 10  # 1s = 10c

    return total

def compare_weapons(source, weapons_dir):
    """Compare generated weapons against source."""
    discrepancies = []

    for filename in sorted(os.listdir(weapons_dir)):
        if not filename.endswith('.json'):
            continue

        filepath = os.path.join(weapons_dir, filename)
        with open(filepath, 'r') as f:
            generated = json.load(f)

        weapon_name = generated['name']
        weapon_key = weapon_name.lower()

        if weapon_key not in source:
            discrepancies.append({
                'weapon': weapon_name,
                'file': filename,
                'issue': f'NOT IN SOURCE - weapon "{weapon_name}" not found in source data'
            })
            continue

        src = source[weapon_key]
        gen_system = generated.get('system', {})

        issues = []

        # Check damage
        src_damage = src['damage'].strip()
        gen_damage = gen_system.get('damage', '')
        # Normalize: "d6" == "1d6", "1" == "1"
        src_normalized = src_damage if src_damage.startswith('1') or src_damage == '1' else f"1{src_damage}"
        if src_normalized != gen_damage and src_damage != gen_damage:
            issues.append(f"DAMAGE: source='{src_damage}' vs generated='{gen_damage}'")

        # Check grip
        grip_map = {'1H': '1h', '2H': '2h', 'V': 'versatile', 'F': 'fist'}
        expected_grip = grip_map.get(src['grip'].strip(), src['grip'].strip().lower())
        if expected_grip != gen_system.get('grip', ''):
            issues.append(f"GRIP: source='{src['grip']}' ({expected_grip}) vs generated='{gen_system.get('grip', '')}'")

        # Check slots
        try:
            src_slots = int(src['slots'].strip()) if src['slots'].strip() not in ['-', ''] else 0
            gen_slots = gen_system.get('slots', 0)
            if src_slots != gen_slots:
                issues.append(f"SLOTS: source={src_slots} vs generated={gen_slots}")
        except ValueError:
            pass

        # Check value
        src_value = parse_value_to_copper(src['value'])
        gen_value = gen_system.get('value', 0)
        if src_value != gen_value:
            issues.append(f"VALUE: source={src_value}c ({src['value']}) vs generated={gen_value}c")

        if issues:
            discrepancies.append({
                'weapon': weapon_name,
                'file': filename,
                'issues': issues
            })

    # Check for missing weapons
    generated_names = set()
    for filename in os.listdir(weapons_dir):
        if filename.endswith('.json'):
            with open(os.path.join(weapons_dir, filename), 'r') as f:
                data = json.load(f)
                generated_names.add(data['name'].lower())

    for weapon_key in source:
        if weapon_key not in generated_names:
            discrepancies.append({
                'weapon': source[weapon_key]['name'],
                'file': 'MISSING',
                'issue': 'MISSING - no generated file for this weapon'
            })

    return discrepancies

def main():
    print("Fetching source content from NoteDiscovery...")
    source_content = get_source_content()

    print("Parsing source weapons...")
    source = parse_source_weapons(source_content)
    print(f"Found {len(source)} weapons in source\n")

    weapons_dir = 'packs/_source/weapons'
    weapon_files = [f for f in os.listdir(weapons_dir) if f.endswith('.json')]
    print(f"Found {len(weapon_files)} generated weapon files\n")

    print("Comparing weapons...")
    discrepancies = compare_weapons(source, weapons_dir)

    if not discrepancies:
        print("\n" + "="*60)
        print("NO DISCREPANCIES FOUND")
        print(f"All {len(weapon_files)} weapons match source!")
        print("="*60)
    else:
        print("\n" + "="*60)
        print(f"FOUND {len(discrepancies)} WEAPON(S) WITH DISCREPANCIES")
        print("="*60 + "\n")
        for d in discrepancies:
            print(f"### {d['weapon']} ({d.get('file', 'N/A')})")
            if 'issue' in d:
                print(f"  - {d['issue']}")
            if 'issues' in d:
                for issue in d['issues']:
                    print(f"  - {issue}")
            print()

if __name__ == '__main__':
    main()
