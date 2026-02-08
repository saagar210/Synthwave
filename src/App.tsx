import { Visualizer } from "./components/Visualizer";
import { Controls } from "./components/Controls";
import { InfoOverlay } from "./components/InfoOverlay";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";

function App() {
  useKeyboardShortcuts();

  return (
    <div className="relative w-full h-screen bg-black">
      <Visualizer />
      <InfoOverlay />
      <Controls />
    </div>
  );
}

export default App;
