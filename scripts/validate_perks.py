#!/usr/bin/env python3
"""Validate generated perk JSONs against NoteDiscovery source."""

import json
import os
import re
import subprocess

def get_source_content():
    """Fetch perk source from NoteDiscovery."""
    result = subprocess.run(
        ['python', 'client.py', 'read', 'gaming/vagabond-rpg/perks-full-list.md'],
        cwd=os.path.expanduser('~/.claude/skills/notediscovery'),
        capture_output=True,
        text=True
    )
    data = json.loads(result.stdout)
    return data['content']

def parse_source_perks(text):
    """Parse source perk data into a dictionary."""
    perks = {}

    # Find the Full Perk Descriptions section
    desc_section = text.split('## Full Perk Descriptions')[1] if '## Full Perk Descriptions' in text else text

    # Split by perk headers
    perk_blocks = re.split(r'\n### ', desc_section)

    for block in perk_blocks[1:]:  # Skip first empty block
        lines = block.strip().split('\n')
        if not lines:
            continue

        name = lines[0].strip()

        # Skip category headers
        if name in ['Stat-Based Perks (No Training Required)', 'Spell-Based Perks', 'No Prerequisites']:
            continue

        prereq = ''
        description_lines = []

        for i, line in enumerate(lines[1:], 1):
            if line.startswith('**Prerequisite:**'):
                prereq = line.replace('**Prerequisite:**', '').strip()
            elif line.strip() and not line.startswith('---'):
                description_lines.append(line)

        description = ' '.join(description_lines).strip()

        if name and description:
            perks[name.lower()] = {
                'name': name,
                'prerequisite': prereq,
                'description': description
            }

    return perks

def normalize_text(text):
    """Normalize text for comparison."""
    if not text:
        return ''
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Normalize whitespace
    text = ' '.join(text.split())
    # Normalize quotes and apostrophes
    text = text.replace('\u2019', "'").replace('\u201c', '"').replace('\u201d', '"')
    return text.strip()

def compare_perks(source, perks_dir):
    """Compare generated perks against source."""
    discrepancies = []

    for filename in sorted(os.listdir(perks_dir)):
        if not filename.endswith('.json'):
            continue

        filepath = os.path.join(perks_dir, filename)
        with open(filepath, 'r') as f:
            generated = json.load(f)

        perk_name = generated['name']
        perk_key = perk_name.lower()

        if perk_key not in source:
            discrepancies.append({
                'perk': perk_name,
                'file': filename,
                'issue': f'NOT IN SOURCE - perk "{perk_name}" not found in source data'
            })
            continue

        src = source[perk_key]
        gen_system = generated.get('system', {})

        issues = []

        # Check description text
        src_desc = normalize_text(src['description'])
        gen_desc = normalize_text(gen_system.get('description', ''))

        if src_desc != gen_desc:
            # Calculate similarity
            src_words = set(src_desc.lower().split())
            gen_words = set(gen_desc.lower().split())
            if src_words and gen_words:
                similarity = len(src_words & gen_words) / len(src_words | gen_words)
            else:
                similarity = 0

            if similarity < 0.9:  # Only report if less than 90% similar
                issues.append(f"DESCRIPTION MISMATCH (similarity: {similarity:.1%})")
                issues.append(f"  SOURCE: {src_desc[:150]}...")
                issues.append(f"  GENERATED: {gen_desc[:150]}...")

        if issues:
            discrepancies.append({
                'perk': perk_name,
                'file': filename,
                'issues': issues
            })

    # Check for missing perks in generated
    generated_names = set()
    for filename in os.listdir(perks_dir):
        if filename.endswith('.json'):
            with open(os.path.join(perks_dir, filename), 'r') as f:
                data = json.load(f)
                generated_names.add(data['name'].lower())

    for perk_key in source:
        if perk_key not in generated_names:
            discrepancies.append({
                'perk': source[perk_key]['name'],
                'file': 'MISSING',
                'issue': 'MISSING - no generated file for this perk'
            })

    return discrepancies

def main():
    print("Fetching source content from NoteDiscovery...")
    source_content = get_source_content()

    print("Parsing source perks...")
    source = parse_source_perks(source_content)
    print(f"Found {len(source)} perks in source\n")

    perks_dir = 'packs/_source/perks'
    perk_files = [f for f in os.listdir(perks_dir) if f.endswith('.json')]
    print(f"Found {len(perk_files)} generated perk files\n")

    print("Comparing perks...")
    discrepancies = compare_perks(source, perks_dir)

    if not discrepancies:
        print("\n" + "="*60)
        print("NO DISCREPANCIES FOUND")
        print(f"All {len(perk_files)} perks match source!")
        print("="*60)
    else:
        print("\n" + "="*60)
        print(f"FOUND {len(discrepancies)} PERK(S) WITH DISCREPANCIES")
        print("="*60 + "\n")
        for d in discrepancies:
            print(f"### {d['perk']} ({d.get('file', 'N/A')})")
            if 'issue' in d:
                print(f"  - {d['issue']}")
            if 'issues' in d:
                for issue in d['issues']:
                    print(f"  - {issue}")
            print()

if __name__ == '__main__':
    main()
