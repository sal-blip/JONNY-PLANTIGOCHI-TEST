import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(new URL('../../scripts/package.json',import.meta.url));
const {loadImage}=require('@napi-rs/canvas');

// The earlier lamp and coffee-table approvals contain a different sofa and its
// floor shadow. This rectangle covers both silhouettes and stops above the table.
const region=[108,148,205,84];
export async function addApprovedSofa(ctx,hour){
  const name=hour===12?'room.png':'night-room.png';
  const image=await loadImage(fileURLToPath(new URL('approved/'+name,import.meta.url)));
  ctx.drawImage(image,...region,...region);
}
