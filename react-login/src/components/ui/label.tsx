import React from 'react';
export function Label(props:any){
  const { children, htmlFor, className } = props;
  return <label htmlFor={htmlFor} className={className}>{children}</label>;
}
export default Label;
