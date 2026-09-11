from pathlib import Path
import json,hashlib,struct,subprocess,datetime
from PIL import Image
root=Path(__file__).resolve().parents[2]
batch='publication-integrated-20260912'
observations=json.loads((root/f'site/media/{batch}/observations.json').read_text())
sha=observations[0]['source_sha']
assert all(item['source_sha']==sha for item in observations)
subprocess.run(['git','diff','--exit-code',sha,'--','app','brand','docs','PAPER.md','LICENSE'],cwd=root,check=True)
previous=json.loads((root/'site/media/main/manifest.json').read_text())
slots=['home','spark','running','attention','approval','artifact','matter','review','continuity','models','integrations','settings','conversation']
assert len(observations)==26
entries=[]
for slot in slots:
 pair=[x for x in observations if x['slot']==slot]
 assert sorted(x['theme'] for x in pair)==['dark','light'],slot
 assert pair[0]['state_id']==pair[1]['state_id'],slot
 for item in pair:
  o=item['observed']; assert (o['width'],o['height'])==(1440,900) and o['dpr'] in (1,2),(slot,o)
  assert o['theme']==item['theme'],(slot,o)
  data=(root/item['asset_path']).read_bytes();assert data[:3]==b'\xff\xd8\xff'
  assert Image.open(root/item['asset_path']).size==(1440,900),slot
  entry=next(x.copy() for x in previous['media'] if x['id']==slot and x['theme']==item['theme'])
  entry.update(source_sha=sha,state_id=item['state_id'],capture_date=item['captured_at'][:10],captured_at=item['captured_at'],asset_path=item['asset_path'],sha256=hashlib.sha256(data).hexdigest(),bytes=len(data),mime_type='image/jpeg',capture_command='CUA browser native viewport screenshot; actual UI controls; no DOM or image edits',operator='Astra integration review',independent_reviewer='Author and non-author scopes are recorded in the integration receipt.',evidence_path='evidence/publication-integrated-20260912/README.md',displayed_path=item['displayed_path'],setup_steps=item['detail'])
  entry['device_pixel_ratio']=o['dpr']
  entries.append(entry)
archive=root/'site/media/archive/main-publication-final-1397b99.json'
if not archive.exists():
 assert previous['source_sha']=='1397b995afe138fd07cd8022391f36d16bc29c85'
 archive.write_bytes((root/'site/media/main/manifest.json').read_bytes())
else:
 assert json.loads(archive.read_text())['source_sha']=='1397b995afe138fd07cd8022391f36d16bc29c85'
manifest={'source_sha':sha,'batch':batch,'origin':'Independent local synthetic fixtures; actual UI and per-image URL recorded','media':entries}
(root/'site/media/main/manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')
p=root/'site/src/capture-plan.mjs';s=p.read_text();old="source_sha: '1397b995afe138fd07cd8022391f36d16bc29c85'";assert old in s or f"source_sha: '{sha}'" in s;p.write_text(s.replace(old,f"source_sha: '{sha}'"))
print(json.dumps({'source_sha':sha,'pairs':13,'images':26,'batch':batch}))
