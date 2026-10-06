from pathlib import Path
import json,struct,hashlib,sys
root=Path(sys.argv[1]);destination=Path(sys.argv[2]);header={'files':{}};blobs=[];offset=0
for p in sorted(root.rglob('*')):
    if not p.is_file():continue
    branch=header;parts=p.relative_to(root).parts
    for name in parts[:-1]:branch=branch['files'].setdefault(name,{'files':{}})
    blob=p.read_bytes();blocks=[hashlib.sha256(blob[n:n+4194304]).hexdigest() for n in range(0,len(blob),4194304)]
    branch['files'][parts[-1]]={'size':len(blob),'offset':str(offset),'integrity':{'algorithm':'SHA256','hash':hashlib.sha256(blob).hexdigest(),'blockSize':4194304,'blocks':blocks}}
    blobs.append(blob);offset+=len(blob)
raw=json.dumps(header,ensure_ascii=False,separators=(',',':')).encode();padded=raw+b'\0'*((-len(raw))%4);payload=4+len(padded)
destination.write_bytes(struct.pack('<4I',4,4+payload,payload,len(raw))+padded+b''.join(blobs))
print('ASAR packed:',destination)
