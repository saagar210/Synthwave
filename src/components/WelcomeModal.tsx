interface WelcomeModalProps {
  onDismiss: () => void;
}

export function WelcomeModal({ onDismiss }: WelcomeModalProps) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="max-w-md w-full mx-4 bg-gray-900/90 border border-white/10 rounded-2xl p-8 text-white">
        <h1 className="text-2xl font-bold mb-6">Welcome to SynthWave</h1>

        <div className="space-y-4 mb-8">
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold">
              1
            </span>
            <div>
              <p className="font-medium">Start capturing</p>
              <p className="text-white/50 text-sm">
                Click Start or drag an audio file onto the window
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold">
              2
            </span>
            <div>
              <p className="font-medium">Switch modes</p>
              <p className="text-white/50 text-sm">
                Press keys 1-7 for different visualization modes
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold">
              3
            </span>
            <div>
              <p className="font-medium">Cycle themes</p>
              <p className="text-white/50 text-sm">
                Press T to cycle through 9 color themes
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-lg font-medium transition-colors"
        >
          Get Started
        </button>

        <div className="mt-4 text-center text-white/30 text-xs">
          H: toggle controls &middot; I: toggle info &middot; F: fullscreen
        </div>
      </div>
    </div>
  );
}
