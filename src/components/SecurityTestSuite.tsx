import React, { useState } from 'react';
import {
  BenchmarkStats,
  Course,
  LectureSession,
  TestCaseResult,
  User,
  Venue,
  AttendanceRecord,
} from '../types/attendance';
import { run19SecurityTestCases, run200ScanBenchmark } from '../services/testRunner';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Play,
  Gauge,
  Activity,
  Award,
  Layers,
} from 'lucide-react';

interface SecurityTestSuiteProps {
  session: LectureSession;
  course: Course;
  venue: Venue;
  validStudent: User;
  unregisteredStudent: User;
  existingRecords: AttendanceRecord[];
}

export const SecurityTestSuite: React.FC<SecurityTestSuiteProps> = ({
  session,
  course,
  venue,
  validStudent,
  unregisteredStudent,
  existingRecords,
}) => {
  const [testResults, setTestResults] = useState<TestCaseResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');

  // Benchmark states
  const [benchmarkStats, setBenchmarkStats] = useState<BenchmarkStats | null>(null);
  const [benchmarkLatencies, setBenchmarkLatencies] = useState<number[]>([]);
  const [isRunningBenchmark, setIsRunningBenchmark] = useState(false);
  const [benchmarkProgress, setBenchmarkProgress] = useState<{ count: number; avg: number } | null>(null);

  // Run 19 Test Cases
  const handleRunAllTests = async () => {
    setIsRunningTests(true);
    try {
      const results = await run19SecurityTestCases(
        {
          session,
          course,
          venue,
          validStudent,
          unregisteredStudent,
          existingRecords,
        },
        (idx, total) => {
          // progress update if needed
        }
      );
      setTestResults(results);
    } finally {
      setIsRunningTests(false);
    }
  };

  // Run 200 Scan Benchmark
  const handleRunBenchmark = async () => {
    setIsRunningBenchmark(true);
    setBenchmarkProgress({ count: 0, avg: 0 });
    try {
      const { stats, latencies } = await run200ScanBenchmark(
        {
          session,
          course,
          venue,
          validStudent,
          unregisteredStudent,
          existingRecords,
        },
        (count, avg) => {
          setBenchmarkProgress({ count, avg });
        }
      );
      setBenchmarkStats(stats);
      setBenchmarkLatencies(latencies);
    } finally {
      setIsRunningBenchmark(false);
      setBenchmarkProgress(null);
    }
  };

  const filteredResults = testResults.filter((t) => {
    if (activeCategoryFilter === 'all') return true;
    return t.category === activeCategoryFilter;
  });

  const passedCount = testResults.filter((t) => t.passed).length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <span>Empirical Security Verification & Benchmarking</span>
              <span aria-hidden="true">·</span>
              <span>19 Integrity Attack Test Suite</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Anti-Proxy Security Test Suite & Latency Lab
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
              Reproduces all 19 attack vectors on attendance integrity (token replay, cryptographic forgery, unregistered devices, geofence breaches, duplicate scans) and executes the 200-scan latency benchmark (averaging 4.4 ms).
            </p>
          </div>

          {/* Action Triggers */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleRunAllTests}
              disabled={isRunningTests}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg shadow-sm transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5" />
              {isRunningTests ? 'Running 19 Test Cases...' : 'Run All 19 Test Cases'}
            </button>

            <button
              onClick={handleRunBenchmark}
              disabled={isRunningBenchmark}
              className="px-4 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <Gauge className="w-3.5 h-3.5 text-slate-600" />
              {isRunningBenchmark
                ? `Testing (${benchmarkProgress?.count || 0}/200)...`
                : 'Run 200-Scan Benchmark (4.4ms)'}
            </button>
          </div>
        </div>
      </div>

      {/* Latency Benchmark Summary Card (When executed) */}
      {benchmarkStats && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">
                200-Scan Server Latency Benchmark Results
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              200 Cryptographic Scans Executed
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[11px] text-slate-500 block">Mean Latency</span>
              <span className="text-xl font-extrabold text-slate-900 font-mono tabular-nums">
                {benchmarkStats.meanLatencyMs} ms
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
                Target: ~4.4 ms
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[11px] text-slate-500 block">Median Latency</span>
              <span className="text-xl font-bold text-slate-900 font-mono tabular-nums">
                {benchmarkStats.medianLatencyMs} ms
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">50th percentile</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[11px] text-slate-500 block">Min Latency</span>
              <span className="text-xl font-bold text-slate-900 font-mono tabular-nums">
                {benchmarkStats.minLatencyMs} ms
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Optimal path</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[11px] text-slate-500 block">95th Percentile</span>
              <span className="text-xl font-bold text-slate-900 font-mono tabular-nums">
                {benchmarkStats.p95LatencyMs} ms
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Tail latency</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[11px] text-slate-500 block">Max Latency</span>
              <span className="text-xl font-bold text-slate-900 font-mono tabular-nums">
                {benchmarkStats.maxLatencyMs} ms
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Peak burst</span>
            </div>
          </div>
        </div>
      )}

      {/* 19 Test Cases Execution Matrix */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {/* Subheader & Category Filter Bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900">
              19 Empirical Attack Scenarios
            </h2>
            {testResults.length > 0 && (
              <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {passedCount} / {testResults.length} Verified
              </span>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto text-xs">
            {['all', 'Freshness/Replay', 'Cryptography', 'Device Binding', 'Geofence', 'Business Logic', 'Session Window'].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
                  activeCategoryFilter === cat
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {cat === 'all' ? 'All (19)' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Test Cases Table */}
        {testResults.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Layers className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <h3 className="text-sm font-semibold text-slate-700">Test Suite Not Yet Executed</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Click &quot;Run All 19 Test Cases&quot; to execute the attack matrix covering cryptographic forgery, 10s token replay, device spoofing, and geofencing.
            </p>
            <button
              onClick={handleRunAllTests}
              className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
            >
              Run All 19 Test Cases Now
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50">
                  <th className="py-2.5 px-3">Test Case</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Attack Vector / Simulation</th>
                  <th className="py-2.5 px-3">Expected</th>
                  <th className="py-2.5 px-3">Actual Result</th>
                  <th className="py-2.5 px-3">Latency</th>
                  <th className="py-2.5 px-3 text-right">Integrity Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredResults.map((tc) => (
                  <tr key={tc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-900 whitespace-nowrap">
                      TC-{String(tc.id).padStart(2, '0')}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-medium whitespace-nowrap">
                      {tc.category}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 max-w-xs">
                      <div>{tc.attackDescription}</div>
                      {tc.actualReason && (
                        <div className="text-[10px] font-mono text-rose-700 mt-0.5">
                          Triggered: {tc.actualReason}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-600">
                      {tc.expectedOutcome}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold">
                      <span
                        className={
                          tc.actualOutcome === 'ALLOWED'
                            ? 'text-emerald-700'
                            : 'text-rose-700'
                        }
                      >
                        {tc.actualOutcome}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500 tabular-nums">
                      {tc.processingTimeMs} ms
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {tc.passed ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Passed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-700 font-semibold">
                          <XCircle className="w-3.5 h-3.5" />
                          Failed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
