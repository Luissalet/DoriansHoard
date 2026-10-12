import { useEffect, useRef } from "react";
import { answerContextRequests, type Editor } from "./copilot-context";

// A mounted form answers the launcher's context request with `read()`; return null when the form is not open.
export function useEditorContext(read: () => Editor | null) {
  const latest = useRef(read);
  latest.current = read;
  useEffect(() => answerContextRequests(() => latest.current()), []);
}
