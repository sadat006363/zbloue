'use client';
import { safeString } from '@/lib/utils';

interface SnippetFullAnalysisProps {
  snippet: any;
  renderJsonValue: (value: any) => string;
}

export default function SnippetFullAnalysis({ snippet, renderJsonValue }: SnippetFullAnalysisProps) {
  return (
    <div className="mt-8 pt-6 border-t border-[#313244]">
      <h2 className="text-2xl font-bold text-white mb-4">📊 Full Analysis</h2>
      
      <div className="space-y-4 text-[#cdd6f4]">
        <div className="bg-[#11111b] p-4 rounded-lg border border-[#313244]">
          <h3 className="text-lg font-semibold text-[#89b4fa]">📌 Title</h3>
          <p>{safeString(snippet.card_title)}</p>
        </div>

        <div className="bg-[#11111b] p-4 rounded-lg border border-[#313244]">
          <h3 className="text-lg font-semibold text-[#89b4fa]">💡 High-Level Summary</h3>
          <p>{safeString(snippet.key_concept)}</p>
        </div>

        <div className="bg-[#11111b] p-4 rounded-lg border border-[#313244]">
          <h3 className="text-lg font-semibold text-[#89b4fa]">🧩 Code Walkthrough</h3>
          <p className="whitespace-pre-wrap">{safeString(snippet.what_this_code_does)}</p>
        </div>

        {snippet.what_works_well && (
          <div className="bg-[#11111b] p-4 rounded-lg border border-[#313244]">
            <h3 className="text-lg font-semibold text-[#a6e3a1]">✅ What Works Well</h3>
            <p className="whitespace-pre-wrap">{renderJsonValue(snippet.what_works_well)}</p>
          </div>
        )}

        {snippet.bugs_and_risky_cases && (
          <div className="bg-[#11111b] p-4 rounded-lg border border-[#313244]">
            <h3 className="text-lg font-semibold text-[#f38ba8]">🐛 Bugs and Risky Cases</h3>
            <p className="whitespace-pre-wrap">{renderJsonValue(snippet.bugs_and_risky_cases)}</p>
          </div>
        )}

        {snippet.edge_cases && (
          <div className="bg-[#11111b] p-4 rounded-lg border border-[#313244]">
            <h3 className="text-lg font-semibold text-[#89b4fa]">🧪 Edge Cases</h3>
            <p className="whitespace-pre-wrap">{renderJsonValue(snippet.edge_cases)}</p>
          </div>
        )}

        {snippet.performance_analysis && (
          <div className="bg-[#11111b] p-4 rounded-lg border border-[#313244]">
            <h3 className="text-lg font-semibold text-[#89b4fa]">⚡ Performance Analysis</h3>
            <p className="whitespace-pre-wrap">{renderJsonValue(snippet.performance_analysis)}</p>
          </div>
        )}

        {snippet.security_analysis && (
          <div className="bg-[#11111b] p-4 rounded-lg border border-[#313244]">
            <h3 className="text-lg font-semibold text-[#f38ba8]">🔒 Security Analysis</h3>
            <p className="whitespace-pre-wrap">{renderJsonValue(snippet.security_analysis)}</p>
          </div>
        )}

        {snippet.production_readiness && (
          <div className="bg-[#11111b] p-4 rounded-lg border border-[#313244]">
            <h3 className="text-lg font-semibold text-[#89b4fa]">🛡️ Production Readiness</h3>
            <p className="whitespace-pre-wrap">{renderJsonValue(snippet.production_readiness)}</p>
          </div>
        )}

        {snippet.recommended_improvements && (
          <div className="bg-[#11111b] p-4 rounded-lg border border-[#313244]">
            <h3 className="text-lg font-semibold text-[#a6e3a1]">🔧 Recommended Improvements</h3>
            <p className="whitespace-pre-wrap">{renderJsonValue(snippet.recommended_improvements)}</p>
          </div>
        )}

        {snippet.improved_code && (
          <div className="bg-[#11111b] p-4 rounded-lg border border-[#313244]">
            <h3 className="text-lg font-semibold text-[#89b4fa]">✨ Improved Code</h3>
            <pre className="text-[#cdd6f4] text-sm whitespace-pre-wrap overflow-auto max-h-[400px]">
              {safeString(snippet.improved_code)}
            </pre>
          </div>
        )}

        {snippet.suggested_tests && (
          <div className="bg-[#11111b] p-4 rounded-lg border border-[#313244]">
            <h3 className="text-lg font-semibold text-[#89b4fa]">🧪 Suggested Tests</h3>
            <p className="whitespace-pre-wrap">{renderJsonValue(snippet.suggested_tests)}</p>
          </div>
        )}

        {snippet.scorecard && (
          <div className="bg-[#11111b] p-4 rounded-lg border border-[#313244]">
            <h3 className="text-lg font-semibold text-[#89b4fa]">📊 Scorecard</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
              {Object.entries(snippet.scorecard).map(([key, value]) => (
                <div key={key} className="bg-[#1e1e2e] p-2 rounded-md text-center border border-[#313244]">
                  <p className="text-xs text-[#6c7086] capitalize">
                    {key.replace(/([A-Z])/g, ' $1')}
                  </p>
                  <p className="text-lg font-bold text-white">
                    {typeof value === 'number' ? value : 0}/10
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {snippet.final_verdict_summary && (
          <div className="bg-[#11111b] p-4 rounded-lg border border-[#313244]">
            <h3 className="text-lg font-semibold text-[#89b4fa]">🏁 Final Verdict</h3>
            <p className="mt-2"><strong>Summary:</strong> {safeString(snippet.final_verdict_summary)}</p>
            {snippet.final_verdict_approved !== undefined && (
              <p><strong>Approved:</strong> {snippet.final_verdict_approved ? '✅ Yes' : '❌ No'}</p>
            )}
            {snippet.final_verdict_next_steps && (
              <p><strong>Next Steps:</strong> {safeString(snippet.final_verdict_next_steps)}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}