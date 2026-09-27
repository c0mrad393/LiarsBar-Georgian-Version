import { Component } from "react";
import { fallbackTo2D } from "../settings.js";

/** If anything 3D throws, drop to the 2D look for the rest of the visit. */
export default class Guard3D extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err) { console.error("3D failed, using 2D", err); fallbackTo2D(); }
  render() { return this.state.failed ? (this.props.fallback ?? null) : this.props.children; }
}
