import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'physiotherapy.settings')
django.setup()

from api.models import Action, ActionSample

print("=== All Actions in Database ===")
actions = Action.objects.all().order_by('-created_at')

for action in actions:
    print(f"\nAction ID: {action.id}")
    print(f"Name: {action.name}")
    print(f"Description: {action.description}")
    print(f"Created: {action.created_at}")
    print(f"Mode: {action.mode}")
    
    # Check samples
    samples = ActionSample.objects.filter(action=action)
    print(f"Samples: {samples.count()}")
    for sample in samples:
        print(f"  Sample {sample.id}: video_url={sample.video_url}")

print(f"\nTotal actions: {actions.count()}")
