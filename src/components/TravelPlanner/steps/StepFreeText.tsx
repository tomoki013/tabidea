"use client";

interface StepFreeTextProps {
  value: string | undefined;
  onChange: (value: string) => void;
}

export default function StepFreeText({ value, onChange }: StepFreeTextProps) {
  return (
    <div className="flex flex-col h-full space-y-6 pt-4">
      <div className="space-y-4 text-center">
        <h2 className="text-3xl font-serif font-bold text-foreground">
          最後に、
          <br />
          特別なご要望は？
        </h2>
        <p className="text-stone-500 font-hand text-sm">
          「美術館巡りをしたい」「静かなカフェに行きたい」など、
          <br />
          自由に入力してください。(任意)
        </p>
      </div>

      <div className="relative">
        <textarea
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="例: 古着屋巡りがしたい、夜景が綺麗なレストランに行きたい..."
          className="w-full h-48 bg-white border border-stone-300 rounded-sm p-6 text-foreground placeholder:text-stone-300 focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary transition-colors resize-none text-lg leading-relaxed font-hand shadow-sm"
          style={{
             backgroundImage: "linear-gradient(transparent, transparent 29px, #e5e7eb 30px)",
             backgroundSize: "100% 30px",
             lineHeight: "30px"
          }}
        />
        <div className="absolute top-0 right-0 p-2 pointer-events-none">
           <span className="text-4xl opacity-10 rotate-12 block">✏️</span>
        </div>
      </div>
    </div>
  );
}
