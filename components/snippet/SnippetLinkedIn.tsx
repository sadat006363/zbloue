'use client';
import CopyButton from '../common/CopyButton';

interface SnippetLinkedInProps {
  linkedinPost: string;
}

export default function SnippetLinkedIn({ linkedinPost }: SnippetLinkedInProps) {
  return (
    <div className="pt-6 border-t border-[#313244] space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-[#fab387] flex items-center gap-2">
          💼 LinkedIn Post
        </h3>
        <CopyButton text={linkedinPost} label="🔗 Copy Post" tooltip="Copy LinkedIn post" />
      </div>
      <div className="bg-[#11111b] p-4 rounded-lg text-[#cdd6f4] text-sm whitespace-pre-wrap leading-relaxed border border-[#313244]">
        {linkedinPost || 'No LinkedIn post available.'}
      </div>
    </div>
  );
}