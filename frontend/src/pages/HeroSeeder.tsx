import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Sparkles, RefreshCw, Image as ImageIcon, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type HeroImageRecord = {
  destination: string;
  destinationSlug: string;
  prompt: string;
  promptVersion: string;
  width: number;
  height: number;
  imageWebp: string;
  imageJpeg?: string | null;
  headline?: string | null;
  subheadline?: string | null;
  ctaLabel?: string | null;
  updatedAt: string;
};

type HeroImageListResponse = {
  items: HeroImageRecord[];
  total: number;
};

const DEFAULT_PROMPT_HINT =
  "Lean into evocative, cinematic light, authentic local details, and a sense of motion that feels welcoming to modern travelers.";

function normalizeHeroImage(payload: Record<string, unknown>): HeroImageRecord {
  const value = payload as Record<string, any>;
  const toOptional = (input: unknown): string | null => {
    if (typeof input === "string") {
      const trimmed = input.trim();
      return trimmed.length ? trimmed : null;
    }
    return null;
  };
  return {
    destination: String(value.destination ?? value.destination_name ?? "").trim(),
    destinationSlug: String(value.destinationSlug ?? value.destination_slug ?? "").trim(),
    prompt: String(value.prompt ?? "").trim(),
    promptVersion: String(value.promptVersion ?? value.prompt_version ?? "").trim(),
    width: Number(value.width ?? 0),
    height: Number(value.height ?? 0),
    imageWebp: typeof value.imageWebp === "string"
      ? value.imageWebp
      : typeof value.image_webp === "string"
        ? value.image_webp
        : "",
    imageJpeg: typeof value.imageJpeg === "string"
      ? value.imageJpeg
      : typeof value.image_jpeg === "string"
        ? value.image_jpeg
        : null,
    headline: toOptional(value.headline),
    subheadline: toOptional(value.subheadline),
    ctaLabel: toOptional(value.ctaLabel ?? value.cta_label),
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : String(value.updated_at ?? ""),
  };
}

export default function HeroSeeder() {
  const [destination, setDestination] = useState("");
  const [promptHint, setPromptHint] = useState(DEFAULT_PROMPT_HINT);
  const [promptOverride, setPromptOverride] = useState("");
  const [headline, setHeadline] = useState("");
  const [subheadline, setSubheadline] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [heroImages, setHeroImages] = useState<HeroImageRecord[]>([]);
  const [selectedImage, setSelectedImage] = useState<HeroImageRecord | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    void loadExistingHeroes();
  }, []);

  const previewImageSrc = useMemo(() => {
    if (!selectedImage) return null;
    return selectedImage.imageWebp || selectedImage.imageJpeg || null;
  }, [selectedImage]);

  function applyRecordToForm(record: HeroImageRecord) {
    setDestination(record.destination ?? "");
    setHeadline(record.headline ?? "");
    setSubheadline(record.subheadline ?? "");
    setCtaLabel(record.ctaLabel ?? "");
  }

  async function loadExistingHeroes() {
    setIsLoadingList(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/hero-images");
      if (!response.ok) {
        throw new Error(`Failed to load heroes (${response.status})`);
      }

      const data = (await response.json()) as HeroImageListResponse;
      const normalized = (data.items || []).map(normalizeHeroImage);
      setHeroImages(normalized);
      if (normalized.length > 0 && !selectedImage) {
        setSelectedImage(normalized[0]);
        applyRecordToForm(normalized[0]);
      }
    } catch (error) {
      console.error("Unable to load hero images", error);
      setErrorMessage(error instanceof Error ? error.message : "Unknown error loading hero images");
    } finally {
      setIsLoadingList(false);
    }
  }

  async function generateHeroImage(
    customDestination?: string,
    copyOverrides?: { headline?: string | null; subheadline?: string | null; ctaLabel?: string | null },
  ) {
    const targetDestination = (customDestination ?? destination).trim();
    if (!targetDestination) {
      setErrorMessage("Destination is required to generate a hero image.");
      return;
    }

    setDestination(targetDestination);

    const nextHeadline = (copyOverrides?.headline ?? headline).trim();
    const nextSubheadline = (copyOverrides?.subheadline ?? subheadline).trim();
    const nextCtaLabel = (copyOverrides?.ctaLabel ?? ctaLabel).trim();

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const payload: Record<string, string> = { destination: targetDestination };
      if (promptHint.trim()) {
        payload.promptHint = promptHint.trim();
      }
      if (promptOverride.trim()) {
        payload.promptOverride = promptOverride.trim();
      }
      payload.headline = nextHeadline;
      payload.subheadline = nextSubheadline;
      payload.ctaLabel = nextCtaLabel;

      const response = await fetch("/api/hero-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ detail: "Hero image generation failed" }));
        throw new Error(typeof errorBody.detail === "string" ? errorBody.detail : "Hero image generation failed");
      }

      const record = normalizeHeroImage((await response.json()) as HeroImageRecord);
      setSelectedImage(record);
      applyRecordToForm(record);
      setHeroImages((prev) => {
        const others = prev.filter((item) => item.destinationSlug !== record.destinationSlug);
        return [record, ...others];
      });
    } catch (error) {
      console.error("Hero image generation failed", error);
      setErrorMessage(error instanceof Error ? error.message : "Hero image generation failed");
    } finally {
      setIsGenerating(false);
    }
  }

  function handleSelectHero(record: HeroImageRecord) {
    setSelectedImage(record);
    applyRecordToForm(record);
  }

  function downloadHeroImage(record: HeroImageRecord, format: "webp" | "jpeg") {
    const dataUrl = format === "webp" ? record.imageWebp : record.imageJpeg;
    if (!dataUrl) return;

    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `${record.destinationSlug}-hero.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await generateHeroImage();
  }

  return (
    <div className="container max-w-6xl mx-auto px-4 md:px-8 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <Sparkles className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Hero Image Seeder</h1>
          <p className="text-muted-foreground text-sm">
            Generate, iterate, and cache Gemini hero images for destinations before rolling them into the explorer.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px,1fr]">
        <Card className="p-6 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Destination</label>
              <Input
                value={destination}
                placeholder="e.g. Kyoto, Japan"
                onChange={(event) => setDestination(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Prompt hint</label>
              <Textarea
                value={promptHint}
                onChange={(event) => setPromptHint(event.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Appends to the tuned base prompt. Use short cinematic notes or vibe descriptors.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Prompt override (optional)</label>
              <Textarea
                value={promptOverride}
                onChange={(event) => setPromptOverride(event.target.value)}
                rows={3}
                placeholder="Provide a full custom prompt to bypass the default template."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Hero headline override</label>
              <Input
                value={headline}
                onChange={(event) => setHeadline(event.target.value)}
                maxLength={140}
                placeholder="e.g. Nightfall over Dubai's skyline"
              />
              <p className="text-xs text-muted-foreground">
                Sets the main hero title. Leave blank to auto-generate from the destination.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Hero subheadline override</label>
              <Textarea
                value={subheadline}
                onChange={(event) => setSubheadline(event.target.value)}
                rows={3}
                maxLength={280}
                placeholder="Tailor the supporting description for the hero."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">CTA label override</label>
              <Input
                value={ctaLabel}
                onChange={(event) => setCtaLabel(event.target.value)}
                maxLength={80}
                placeholder="e.g. Plan desert nights + skyline views"
              />
              <p className="text-xs text-muted-foreground">
                Controls the primary hero button text. Leave blank to auto-tailor based on suggestions.
              </p>
            </div>

            {errorMessage && (
              <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                {errorMessage}
              </div>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={isGenerating} className="flex-1">
                <Sparkles className="h-4 w-4 mr-2" />
                {isGenerating ? "Generating..." : "Generate hero"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => void loadExistingHeroes()} disabled={isLoadingList}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh list
              </Button>
            </div>
          </form>

          {selectedImage && (
            <div className="space-y-3 border-t border-border/60 pt-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Latest output</h2>
                <Badge variant="secondary">{selectedImage.destination}</Badge>
              </div>
              <div className="space-y-2 text-sm">
                <p className="font-medium">{selectedImage.destination} · {selectedImage.destinationSlug}</p>
                <p className="text-muted-foreground">{selectedImage.width} × {selectedImage.height} · {selectedImage.promptVersion}</p>
                {(selectedImage.headline || selectedImage.subheadline || selectedImage.ctaLabel) && (
                  <div className="space-y-1 rounded-md border border-border/60 bg-muted/40 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hero copy</p>
                    {selectedImage.headline && (
                      <p>
                        <span className="font-medium text-foreground">Headline:</span> {selectedImage.headline}
                      </p>
                    )}
                    {selectedImage.subheadline && (
                      <p className="text-muted-foreground">
                        <span className="font-medium text-foreground">Subheadline:</span> {selectedImage.subheadline}
                      </p>
                    )}
                    {selectedImage.ctaLabel && (
                      <p>
                        <span className="font-medium text-foreground">CTA:</span> {selectedImage.ctaLabel}
                      </p>
                    )}
                  </div>
                )}
                <div className="bg-muted/60 rounded-md p-3 text-xs text-muted-foreground whitespace-pre-wrap">
                  {selectedImage.prompt}
                </div>
                <p className="text-xs text-muted-foreground">
                  Updated {new Date(selectedImage.updatedAt).toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <ImageIcon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Preview</h2>
                  <p className="text-sm text-muted-foreground">WebP output with JPEG fallback.</p>
                </div>
              </div>
              {selectedImage && (
                <Badge variant="outline">{selectedImage.destinationSlug}</Badge>
              )}
            </div>

            <div className="aspect-video w-full overflow-hidden rounded-lg border border-border/60 bg-muted/40 flex items-center justify-center">
              {previewImageSrc ? (
                <img
                  src={previewImageSrc}
                  alt={`Hero for ${selectedImage?.destination}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-muted-foreground text-sm">Generate a hero to preview it here.</div>
              )}
            </div>

            {selectedImage && (
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => downloadHeroImage(selectedImage, "webp")}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download WebP
                </Button>
                {selectedImage.imageJpeg && (
                  <Button
                    variant="outline"
                    onClick={() => downloadHeroImage(selectedImage, "jpeg")}
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download JPEG
                  </Button>
                )}
              </div>
            )}
          </Card>

          <Card className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Seeded destinations</h2>
              <Badge variant="outline">{heroImages.length} cached</Badge>
            </div>

            {isLoadingList ? (
              <p className="text-sm text-muted-foreground">Loading hero catalog…</p>
            ) : heroImages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hero images saved yet. Generate your first one!</p>
            ) : (
              <div className="space-y-4">
                {heroImages.map((record) => (
                  <div
                    key={record.destinationSlug}
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border border-border/50 rounded-lg p-3"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{record.destination}</span>
                        <Badge variant="secondary">{record.destinationSlug}</Badge>
                        <span className="text-xs text-muted-foreground">{record.width} × {record.height}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Updated {new Date(record.updatedAt).toLocaleString()} · {record.promptVersion}
                      </p>
                      {(record.headline || record.ctaLabel) && (
                        <p className="text-xs text-muted-foreground truncate">
                          {record.headline || record.ctaLabel}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleSelectHero(record)}>
                        View
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          handleSelectHero(record);
                          void generateHeroImage(record.destination, {
                            headline: record.headline ?? "",
                            subheadline: record.subheadline ?? "",
                            ctaLabel: record.ctaLabel ?? "",
                          });
                        }}
                        disabled={isGenerating}
                      >
                        <Sparkles className="h-4 w-4 mr-1" />
                        Regenerate
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
