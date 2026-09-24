import PilgrimagePlanner from "./components/PilgrimagePlanner";
import { mockWorks } from "./data/mockWorks";

export default function Home() {
  return <PilgrimagePlanner works={mockWorks} />;
}
