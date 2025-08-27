import { InputForm } from "./InputForm";

interface WelcomeScreenProps {
  handleSubmit: (
    submittedInputValue: string,
    effort: string,
    model: string,
    tone?: string,
    configOverrides?: any
  ) => void;
  onCancel: () => void;
  isLoading: boolean;
  urlConfig?: {
    wordCount: number;
    linkCount: number;
    useInlineLinks: boolean;
    useApaStyle: boolean;
    customPersona: string;
  };
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  handleSubmit,
  onCancel,
  isLoading,
  urlConfig,
}) => (
  <div className="flex flex-col items-center justify-center text-center px-4 flex-1 w-full max-w-3xl mx-auto gap-4">
    <div>
      <h1 className="text-5xl md:text-6xl font-semibold text-foreground mb-3">
        Article Generator
      </h1>
      <p className="text-xl md:text-2xl text-muted-foreground">
        Create well-sourced articles on any topic
      </p>
    </div>
    <div className="w-full mt-4">
      <InputForm
        key="input-v2"
        onSubmit={handleSubmit}
        isLoading={isLoading}
        onCancel={onCancel}
        hasHistory={false}
        urlConfig={urlConfig}
      />
    </div>
    <p className="text-xs text-muted-foreground">
      Powered by Google Gemini AI Research and LangGraph
    </p>
  </div>
);
