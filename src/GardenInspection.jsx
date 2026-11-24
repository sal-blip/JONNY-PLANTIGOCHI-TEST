import React,{useLayoutEffect,useRef} from 'react';

// Keep native focus containment and Escape support while the room itself stays visible.
export default function GardenInspection({title,location,close,children}){
  const surface=useRef(null),heading=useRef(null);
  useLayoutEffect(()=>{
    const el=surface.current;
    el.showModal();
    heading.current.focus({preventScroll:true});
    return ()=>el.close();
  },[]);
  return <dialog ref={surface} className="garden-inspection" aria-labelledby="inspection-name"
    onCancel={event=>{event.preventDefault();close();}}
    onClick={event=>{if(event.target===event.currentTarget)close();}}>
    <header><div>
      <h2 id="inspection-name" tabIndex="-1" ref={heading}>{title}</h2>
      {location && <p>{location}</p>}
    </div></header>
    <div className="inspection-options">
      {children}
    </div>
    <footer><button type="button" aria-label="Close menu" onClick={close}>Done</button></footer>
  </dialog>;
}
