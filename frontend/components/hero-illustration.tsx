export function HeroIllustration() {
  return (
    <div className="w-full h-[400px] bg-gradient-to-br from-primary/5 to-primary-foreground/5 flex items-center justify-center p-6">
      <div className="relative w-full max-w-md">
        <div
          className="absolute -top-6 -left-6 w-12 h-12 rounded-full bg-primary/10 animate-pulse"
          style={{ animationDelay: "0.1s" }}
        ></div>
        <div
          className="absolute -bottom-8 -right-8 w-16 h-16 rounded-full bg-primary/10 animate-pulse"
          style={{ animationDelay: "0.3s" }}
        ></div>

        <div className="rounded-xl border bg-background shadow-lg overflow-hidden">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-primary"
                >
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium">Skin Analysis</h3>
                <p className="text-sm text-muted-foreground">Upload photos for AI analysis</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: "75%" }}></div>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Analyzing</span>
                <span>75%</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="aspect-square rounded-md bg-muted/50 overflow-hidden">
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary-foreground/20"></div>
              </div>
              <div className="aspect-square rounded-md bg-muted/50 overflow-hidden">
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary-foreground/20"></div>
              </div>
              <div className="aspect-square rounded-md bg-muted/50 overflow-hidden">
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary-foreground/20"></div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Potential Conditions</h4>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs">Contact Dermatitis</span>
                  <span className="text-xs font-medium">85%</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: "85%" }}></div>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs">Eczema</span>
                  <span className="text-xs font-medium">62%</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: "62%" }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

