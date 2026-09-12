import React, { type SVGProps } from "react";

export function Svg({ children, style, width, height, viewBox, ...rest }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={width}
      height={height}
      viewBox={viewBox}
      style={{ display: "inline-block", ...style }}
      {...rest}
    >
      {children}
    </svg>
  );
}

export function Rect(props: SVGProps<SVGRectElement>) {
  return <rect {...props} />;
}

export function Circle(props: SVGProps<SVGCircleElement>) {
  return <circle {...props} />;
}

export function Line(props: SVGProps<SVGLineElement>) {
  return <line {...props} />;
}

export function Path(props: SVGProps<SVGPathElement>) {
  return <path {...props} />;
}

export function G(props: SVGProps<SVGGElement>) {
  return <g {...props} />;
}

export function SvgText({ children, style, ...rest }: SVGProps<SVGTextElement>) {
  return (
    <text style={{ fontFamily: "Helvetica, sans-serif", ...style }} {...rest}>
      {children}
    </text>
  );
}
