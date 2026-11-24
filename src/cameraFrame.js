// Coordinates are fractions of a complete room. The frame keeps its aspect ratio.
const bound=(value,min,max)=>Math.max(min,Math.min(max,value));
export const wholeRoom=Object.freeze({x:.5,y:.5,zoom:1});
export function cameraFrame(x,y,scale){
  const zoom=bound(scale,1,4),half=.5/zoom;
  return {x:bound(x,half,1-half),y:bound(y,half,1-half),zoom};
}
export function zoomAt(frame,scale,u=.5,v=.5){
  const zoom=bound(scale,1,4);
  const delta=1/frame.zoom-1/zoom;
  return cameraFrame(frame.x+(u-.5)*delta,frame.y+(v-.5)*delta,zoom);
}
export function cameraRegion(frame,width,height){
  const w=width/frame.zoom,h=height/frame.zoom;
  return {x:frame.x*width-w/2,y:frame.y*height-h/2,w,h};
}
