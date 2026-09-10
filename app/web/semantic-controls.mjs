// Presentation-only facade. Callers continue to own capability checks and handlers.
import { semanticEntries } from './product-semantics.generated.mjs';
import { action, icon } from './ui-controls.mjs';
export function semanticPresentation(key, {surface='app', values={}}={}) {
  const entry=semanticEntries[key];
  if(!entry || !entry.allowedSurfaces.includes(surface)) throw new Error(`Unsupported semantic surface: ${key}/${surface}`);
  const label=entry.accessibleName.en.replace(/\{([a-z]+)\}/g,(_,name)=>{
    if(typeof values[name]!=='string' || (name!=='context' && !values[name].trim())) throw new Error(`Missing semantic name value: ${key}/${name}`);
    return values[name];
  });
  return {entry,label,glyph:entry.glyphRef};
}
export function semanticIcon(key, {size=20,...context}={}) {
  const {glyph}=semanticPresentation(key,context);
  const node=glyph ? icon(glyph,{size}) : null;
  if(node) node.setAttribute("data-semantic-key",key);
  return node;
}
export function semanticAction(key, onClick, {values={},...options}={}) {
  const {entry,label,glyph}=semanticPresentation(key,{values});
  if(entry.symbolClass!=='Action' || !glyph) throw new Error(`Semantic action requires an admitted action glyph: ${key}`);
  const button=action(glyph,label,onClick,options);
  button.setAttribute("data-semantic-key",key);
  return button;
}
