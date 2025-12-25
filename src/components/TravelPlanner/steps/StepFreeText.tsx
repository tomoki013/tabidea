"use client";

interface StepFreeTextProps {
  value: string | undefined;
  onChange: (value: string) => void;
}

export default function StepFreeText({ value, onChange }: StepFreeTextProps) {
  return (
    <div className="flex flex-col h-full space-y-6 pt-4">
      <div className="space-y-4">
        <h2 className="text-3xl font-bold text-white">
          最後に、
          <br />
          特別なご要望は？
        </h2>
        <p className="text-white/60 text-sm">
          「美術館巡りをしたい」「静かなカフェに行きたい」など、
          <br />
          自由に入力してください。(任意)
        </p>
      </div>

      <textarea
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="例: 古着屋巡りがしたい、夜景が綺麗なレストランに行きたい..."
        className="w-full h-48 bg-white/10 border border-white/20 rounded-2xl p-6 text-white placeholder:text-white/30 focus:outline-hidden focus:border-white transition-colors resize-none text-lg leading-relaxed"
      />
    </div>
  );
}
