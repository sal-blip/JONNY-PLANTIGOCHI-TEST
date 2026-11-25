// Coordinates are fractions of one room. The finder can extend past the room at wide angles.
const bound=(value,min,max)=>Math.max(min,Math.min(max,value));
const wholeRoomShape=Object.freeze({w:1,h:1});
export const wholeRoom=Object.freeze({x:.5,y:.5,zoom:1});
export const MAX_CAMERA_ZOOM=4;

export function viewfinderShape(aspect,roomAspect){
  return {w:Math.min(1,aspect/roomAspect),h:Math.min(1,roomAspect/aspect)};
}

// At 1× fit the entire room. At 4× retain the original close-up field of view.
function opticalZoom(zoom,fit){
  return fit+(bound(zoom,1,MAX_CAMERA_ZOOM)-1)*(MAX_CAMERA_ZOOM-fit)/(MAX_CAMERA_ZOOM-1);
}
export function pinchZoom(zoom,ratio,shape){
  const fit=Math.min(shape.w,shape.h);
  return 1+(opticalZoom(zoom,fit)*ratio-fit)*(MAX_CAMERA_ZOOM-1)/(MAX_CAMERA_ZOOM-fit);
}
export function finderSpan(zoom,shape=wholeRoomShape){
  const scale=opticalZoom(zoom,Math.min(shape.w,shape.h));
  return {w:shape.w/scale,h:shape.h/scale};
}
export function cameraFrame(x,y,scale,shape=wholeRoomShape){
  const zoom=bound(scale,1,MAX_CAMERA_ZOOM),span=finderSpan(zoom,shape);
  const halfX=Math.min(1,span.w)/2,halfY=Math.min(1,span.h)/2;
  return {x:bound(x,halfX,1-halfX),y:bound(y,halfY,1-halfY),zoom};
}
export function zoomAt(frame,scale,u=.5,v=.5,shape=wholeRoomShape){
  const before=finderSpan(frame.zoom,shape),after=finderSpan(scale,shape);
  return cameraFrame(frame.x+(u-.5)*(before.w-after.w),frame.y+(v-.5)*(before.h-after.h),scale,shape);
}
export function cameraRegion(frame,width,height,shape=wholeRoomShape){
  frame=cameraFrame(frame.x,frame.y,frame.zoom,shape);
  const span=finderSpan(frame.zoom,shape);
  const w=width*Math.min(1,span.w),h=height*Math.min(1,span.h);
  return {x:frame.x*width-w/2,y:frame.y*height-h/2,w,h};
}
