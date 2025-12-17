#!/usr/bin/env python3
"""Validate generated spell JSONs against NoteDiscovery source."""

import json
import os
import re
import subprocess

def get_source_content():
    """Fetch spell source from NoteDiscovery."""
    result = subprocess.run(
        ['python', 'client.py', 'read', 'gaming/vagabond-rpg/spells-full-text.md'],
        cwd=os.path.expanduser('~/.claude/skills/notediscovery'),
        capture_output=True,
        text=True
    )
    data = json.loads(result.stdout)
    return data['content']

def parse_source_spells(text):
    """Parse source spell data into a dictionary."""
    spells = {}
    current_spell = None
    current_damage = None
    effect_lines = []
    crit_lines = []
    in_crit = False

    for line in text.strip().split('\n'):
        line = line.rstrip()

        # New spell header
        if line.startswith('## '):
            # Save previous spell
            if current_spell:
                effect = '\n'.join(effect_lines).strip()
                crit = '\n'.join(crit_lines).strip()
                spells[current_spell.lower()] = {
                    'name': current_spell,
                    'damage': current_damage,
                    'effect': effect,
                    'crit': crit
                }

            current_spell = line[3:].strip()
            current_damage = None
            effect_lines = []
            crit_lines = []
            in_crit = False

        elif line.startswith('**Damage Base:**'):
            damage = line.replace('**Damage Base:**', '').strip()
            current_damage = '' if damage == '-' else damage.lower()

        elif line.startswith('**Crit:**'):
            in_crit = True
            crit_text = line.replace('**Crit:**', '').strip()
            if crit_text:
                crit_lines.append(crit_text)

        elif current_spell and line and not line.startswith('---'):
            if in_crit:
                crit_lines.append(line)
            else:
                effect_lines.append(line)

    # Save last spell
    if current_spell:
        effect = '\n'.join(effect_lines).strip()
        crit = '\n'.join(crit_lines).strip()
        spells[current_spell.lower()] = {
            'name': current_spell,
            'damage': current_damage,
            'effect': effect,
            'crit': crit
        }

    return spells

def normalize_text(text):
    """Normalize text for comparison - strip HTML, normalize whitespace."""
    if not text:
        return ''
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Normalize whitespace
    text = ' '.join(text.split())
    # Normalize quotes and apostrophes
    text = text.replace('\u2019', "'").replace('\u201c', '"').replace('\u201d', '"')
    return text.strip()

def compare_spells(source, spells_dir):
    """Compare generated spells against source."""
    discrepancies = []

    for filename in sorted(os.listdir(spells_dir)):
        if not filename.endswith('.json'):
            continue

        filepath = os.path.join(spells_dir, filename)
        with open(filepath, 'r') as f:
            generated = json.load(f)

        spell_name = generated['name']
        spell_key = spell_name.lower()

        if spell_key not in source:
            discrepancies.append({
                'spell': spell_name,
                'file': filename,
                'issue': 'NOT IN SOURCE - spell not found in source data'
            })
            continue

        src = source[spell_key]
        gen_system = generated.get('system', {})

        issues = []

        # Check damage type
        gen_damage = gen_system.get('damageType', '')
        if gen_damage != src['damage']:
            issues.append(f"DAMAGE: source='{src['damage']}' vs generated='{gen_damage}'")

        # Check effect text
        src_effect = normalize_text(src['effect'])
        gen_effect = normalize_text(gen_system.get('effect', ''))

        if src_effect != gen_effect:
            # Find the difference
            issues.append(f"EFFECT MISMATCH")
            issues.append(f"  SOURCE: {src_effect[:200]}...")
            issues.append(f"  GENERATED: {gen_effect[:200]}...")

        # Check crit effect
        src_crit = normalize_text(src['crit'])
        gen_crit = normalize_text(gen_system.get('critEffect', ''))

        if src_crit != gen_crit:
            issues.append(f"CRIT MISMATCH")
            issues.append(f"  SOURCE: '{src_crit}'")
            issues.append(f"  GENERATED: '{gen_crit}'")

        if issues:
            discrepancies.append({
                'spell': spell_name,
                'file': filename,
                'issues': issues
            })

    # Check for missing spells in generated
    generated_names = set()
    for filename in os.listdir(spells_dir):
        if filename.endswith('.json'):
            with open(os.path.join(spells_dir, filename), 'r') as f:
                data = json.load(f)
                generated_names.add(data['name'].lower())

    for spell_key in source:
        if spell_key not in generated_names:
            discrepancies.append({
                'spell': source[spell_key]['name'],
                'file': 'MISSING',
                'issue': 'MISSING - no generated file for this spell'
            })

    return discrepancies

def main():
    print("Fetching source content from NoteDiscovery...")
    source_content = get_source_content()

    print("Parsing source spells...")
    source = parse_source_spells(source_content)
    print(f"Found {len(source)} spells in source\n")

    spells_dir = 'packs/_source/spells'
    spell_files = [f for f in os.listdir(spells_dir) if f.endswith('.json')]
    print(f"Found {len(spell_files)} generated spell files\n")

    print("Comparing spells...")
    discrepancies = compare_spells(source, spells_dir)

    if not discrepancies:
        print("\n" + "="*60)
        print("NO DISCREPANCIES FOUND")
        print(f"All {len(spell_files)} spells match source exactly!")
        print("="*60)
    else:
        print("\n" + "="*60)
        print(f"FOUND {len(discrepancies)} SPELL(S) WITH DISCREPANCIES")
        print("="*60 + "\n")
        for d in discrepancies:
            print(f"### {d['spell']} ({d.get('file', 'N/A')})")
            if 'issue' in d:
                print(f"  - {d['issue']}")
            if 'issues' in d:
                for issue in d['issues']:
                    print(f"  - {issue}")
            print()

if __name__ == '__main__':
    main()
