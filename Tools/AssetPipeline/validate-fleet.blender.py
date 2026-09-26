import bpy
import json
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[2]
blend = PROJECT / 'ArtDirection/Production/SpacePatriot-Fleet.blend'
bpy.ops.wm.open_mainfile(filepath=str(blend))
crafts = json.loads((PROJECT / 'Assets/SpacePatriot/Resources/Fleet.json').read_text())['crafts']
report = {'blend': blend.name, 'families': [], 'checks': []}
for family in range(10):
    collection = bpy.data.collections.get('refit-' + str(family))
    if collection is None:
        raise RuntimeError('Missing Blender collection refit-' + str(family))
    craft = crafts[family * 10]
    engines = sum(1 for ob in collection.objects if ob.type == 'MESH' and ob.name.startswith('Drive structural casing'))
    expected = int(craft['engines'])
    if engines != expected:
        raise RuntimeError(f"{craft['name']}: expected {expected} engine housings, found {engines}")
    names = [ob.name for ob in collection.objects]
    report['families'].append({'family': family, 'name': craft['name'], 'engines': engines, 'meshObjects': sum(ob.type == 'MESH' for ob in collection.objects)})

carrier = bpy.data.collections['refit-9']
carrierNames = [ob.name for ob in carrier.objects]
for required in ['Flight deck island', 'Landing lane centerline', 'Hangar throat shadow', 'Retracting blast door']:
    if not any(name.startswith(required) for name in carrierNames):
        raise RuntimeError('Carrier is missing ' + required)
shuttleNames = [ob.name for ob in bpy.data.collections['refit-6'].objects]
if not any(name.startswith('Shuttle passenger cabin') for name in shuttleNames):
    raise RuntimeError('Gannet shuttle is missing its passenger cabin.')
report['checks'] = [
    'PASS: all 10 ship families have the propulsion count specified by Fleet.json.',
    'PASS: carrier has a flight deck, landing lanes, and framed hangar/blast door.',
    'PASS: shuttle has a dedicated passenger cabin.',
]
out = PROJECT / 'Validation/fleet-geometry-check.json'
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
