'use client';

export default function SyncDevices() {
  return (
    <div className="card mb-6">
      <h2 className="text-lg font-semibold text-gw-stone-800 mb-2">Sync &amp; Devices</h2>
      <p className="text-sm text-gw-stone-500 mb-4">
        Peer-to-peer sync between your devices on the same network.
      </p>

      {/* This Device */}
      <div className="p-3 rounded-lg bg-gw-stone-50 border border-gw-stone-200 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gw-stone-200 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-gw-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-gw-stone-700">This device</div>
            <div className="text-xs text-gw-stone-400">Primary</div>
          </div>
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gw-green-100 text-gw-green-700">Active</span>
        </div>
      </div>

      {/* Connected Peers */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gw-stone-700 mb-2">Connected Peers</h3>
        <div className="flex items-center gap-2 p-3 rounded-lg bg-gw-stone-50 border border-dashed border-gw-stone-200">
          <span className="relative flex h-2 w-2">
            <span className="relative inline-flex h-2 w-2 rounded-full bg-gw-stone-400" />
          </span>
          <span className="text-xs text-gw-stone-400 italic">No peers found on the local network</span>
        </div>
      </div>

      {/* Last Sync */}
      <div className="flex items-center justify-between pt-3 border-t border-gw-stone-100">
        <div className="text-sm text-gw-stone-600">
          <span className="font-medium">Last sync:</span>{' '}
          <span className="text-gw-stone-400">Never</span>
        </div>
        <button
          disabled
          className="px-3 py-1.5 text-xs rounded-lg border border-gw-stone-200 text-gw-stone-400 cursor-not-allowed font-medium"
        >
          Sync Now
        </button>
      </div>
    </div>
  );
}
