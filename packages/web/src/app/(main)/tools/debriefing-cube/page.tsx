import type { Metadata } from "next"
import DebriefingCube from "@/components/tools/debriefing-cube"

export const metadata: Metadata = {
  title: "Debriefing cube",
  description:
    "An electronic version of the Debriefing Cube facilitation tool with 42 reflection questions across 6 lenses for powerful debriefing sessions.",
}

export default function DebriefingCubePage() {
  return <DebriefingCube />
}
