import assert from 'node:assert/strict';
import test from 'node:test';
import {originalImageTypes,rasterType,readFrameUpload,validOriginalId} from '../src/frameUpload.js';

const jpeg='/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAABf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8ADf/Z';
const png='iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAEUlEQVR4nGO0cPZjYGBgYAAABXsAy+HFljMAAAAASUVORK5CYII=';
const gif='R0lGODlhAgABAIEAADhDTgAAAAAAAAAAACH5BAEAAAAALAAAAAACAAEAAAgFAAEACAgAOw==';
const webp='UklGRkwAAABXRUJQVlA4WAoAAAAQAAAAAQAAAAAAQUxQSAMAAAAAAAAAVlA4ICIAAABwAQCdASoCAAEAAUAmJZQCdAFAAAD+9j/YMttinJj0TAAA';
const bmp='Qk0+AAAAAAAAADYAAAAoAAAAAgAAAAEAAAABABgAAAAAAAgAAADEDgAAxA4AAAAAAAAAAAAATkM4TkM4AAA=';

function fileTypeBox(major, minor, ...compatible) {
  const brands=Buffer.from('ftyp'+major+minor+compatible.join(''),'latin1');
  const size=Buffer.alloc(4);
  size.writeUInt32BE(brands.length+4);
  return Buffer.concat([size,brands]);
}

test('detects actual raster bytes irrespective of the picker MIME and filename',async()=>{
  for(const [source,type] of [[png,'image/png'],[jpeg,'image/jpeg'],[gif,'image/gif'],
    [webp,'image/webp'],[bmp,'image/bmp']]){
    const file=new File([Buffer.from(source,'base64')],'untitled.txt',{type:'text/plain'});
    assert.equal(await rasterType(file),type);
    assert.ok(originalImageTypes.includes(type));
  }
});

test('distinguishes AVIF, HEIC and generic HEIF, including compatible brands',async()=>{
  for(const [brands,type] of [
    [['avif','0000'],'image/avif'],[['mif1','0000','miaf','avis'],'image/avif'],
    [['heic','0000','mif1'],'image/heic'],[['mif1','0000','heix'],'image/heic'],
    [['mif1','0000'],'image/heif'],[['msf1','0000'],'image/heif'],
  ]){
    assert.equal(await rasterType(new Blob([fileTypeBox(...brands)])),type);
    assert.ok(originalImageTypes.includes(type));
  }
  const box=fileTypeBox('mif1','0000','avif');
  const extended=Buffer.alloc(16);
  extended.writeUInt32BE(1);extended.write('ftyp',4);extended.writeBigUInt64BE(BigInt(box.length+8),8);
  assert.equal(await rasterType(new Blob([extended,box.subarray(8)])),'image/avif');
});

test('rejects mislabeled documents, broken headers, video containers and brands outside ftyp',async()=>{
  const truncatedPNG=Buffer.from(png,'base64').subarray(0,20);
  const truncatedWebP=Buffer.from(webp,'base64').subarray(0,24);
  const mp4=fileTypeBox('isom','avif','mp42');
  const badLength=fileTypeBox('mif1','0000');
  badLength.writeUInt32BE(256);
  for(const bytes of [Buffer.alloc(0),Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
    truncatedPNG,truncatedWebP,mp4,badLength,Buffer.concat([fileTypeBox('isom','0000'),Buffer.from('heic'.repeat(12))])]){
    const file=new File([bytes],'photo.png',{type:'image/png'});
    assert.equal(await rasterType(file),null);
    await assert.rejects(readFrameUpload(file), /supported image/);
  }
});

function stubDecoder(t, fails=false){
  const loaded=[];
  t.mock.method(URL,'createObjectURL',blob=>{loaded.push(blob);return 'blob:test-frame';});
  const release=t.mock.method(URL,'revokeObjectURL',()=>{});
  class TestImage{
    naturalWidth=2;
    naturalHeight=1;
    async decode(){if(fails)throw new Error('Raster cannot be decoded');}
  }
  for (const [key,value] of Object.entries({Image:TestImage,document:{createElement(){
    return {getContext:()=>({fillRect(){},drawImage(){}}),toDataURL:()=>'data:image/jpeg;base64,'+jpeg};
  }}})){
    const previous=Object.getOwnPropertyDescriptor(globalThis,key);
    Object.defineProperty(globalThis,key,{configurable:true,value});
    t.after(()=>{if(previous)Object.defineProperty(globalThis,key,previous);else delete globalThis[key];});
  }
  return {loaded,release};
}

test('returns a separate preview and exact source bytes, normalized to their actual MIME',async t=>{
  const {loaded,release}=stubDecoder(t);
  const bytes=Buffer.from(png,'base64');
  const picked=new File([bytes],'Camera export',{type:''});
  const {photo,frameOriginal}=await readFrameUpload(picked);
  assert.equal(photo.originalId,frameOriginal.id);
  assert.ok(validOriginalId(frameOriginal.id));
  assert.equal(frameOriginal.blob.type,'image/png');
  assert.deepEqual(Buffer.from(await frameOriginal.blob.arrayBuffer()),bytes);
  assert.equal(loaded[0],frameOriginal.blob);
  assert.deepEqual([photo.width,photo.height],[2,1]);
  assert.ok(photo.src.startsWith('data:image/jpeg;base64,'));
  assert.equal(release.mock.callCount(),1);
});

test('a recognized signature still requires successful image decoding',async t=>{
  const {release}=stubDecoder(t,true);
  await assert.rejects(readFrameUpload(new Blob([Buffer.from(jpeg,'base64').subarray(0,16)])),/cannot be decoded/);
  assert.equal(release.mock.callCount(),1);
});

test('only accepts complete UUIDs as original asset references',()=>{
  for (const value of [null,42,'','../../file',crypto.randomUUID()+'\n',
    '00000000-0000-0000-0000-000000000000','16ca6253-f97d-4260-736a-8607486ca670']) assert.equal(validOriginalId(value),false);
  assert.ok(validOriginalId('16ca6253-f97d-4260-936a-8607486ca670'));
  assert.ok(validOriginalId(crypto.randomUUID()));
});
