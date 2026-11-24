// Coordinates are fractions of a complete room. The frame keeps its aspect ratio.
const bound=(value,min,max)=>Math.max(min,Math.min(max,value));
export const wholeRoom=Object.freeze({x:.5,y:.5,zoom:1});
export function cameraFrame(x,y,scale,shape=wholeRoomShape){
  const zoom=bound(scale,1,4),halfX=.5*shape.w/zoom,halfY=.5*shape.h/zoom;
  return {x:bound(x,halfX,1-halfX),y:bound(y,halfY,1-halfY),zoom};
}
const wholeRoomShape=Object.freeze({w:1,h:1});
export function viewfinderShape(aspect,roomAspect){
  return {w:Math.min(1,aspect/roomAspect),h:Math.min(1,roomAspect/aspect)};
}
export function zoomAt(frame,scale,u=.5,v=.5,shape=wholeRoomShape){
  const zoom=bound(scale,1,4);
  const delta=1/frame.zoom-1/zoom;
  return cameraFrame(frame.x+(u-.5)*delta*shape.w,frame.y+(v-.5)*delta*shape.h,zoom,shape);
}
export function cameraRegion(frame,width,height,shape=wholeRoomShape){
  frame=cameraFrame(frame.x,frame.y,frame.zoom,shape);
  const w=width*shape.w/frame.zoom,h=height*shape.h/frame.zoom;
  return {x:frame.x*width-w/2,y:frame.y*height-h/2,w,h};
}
