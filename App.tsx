import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { SignalStatus, AlertMessage } from './types';

// --- UI Components ---

const StatusIndicator: React.FC<{ status: SignalStatus }> = ({ status }) => {
  const statusConfig = {
    [SignalStatus.Good]: { text: 'OPERATIONAL', color: 'bg-green-500', textColor: 'text-green-400' },
    [SignalStatus.Warning]: { text: 'WARNING', color: 'bg-yellow-500', textColor: 'text-yellow-400' },
    [SignalStatus.Error]: { text: 'CRITICAL', color: 'bg-red-500', textColor: 'text-red-400' },
  };

  const { text, color, textColor } = statusConfig[status];

  return (
    <div className="flex items-center gap-3 p-4 bg-gray-800 rounded-lg shadow-md">
      <div className={`w-4 h-4 rounded-full ${color} animate-pulse`}></div>
      <div>
        <p className="text-sm text-gray-400">System Status</p>
        <p className={`font-bold text-lg ${textColor}`}>{text}</p>
      </div>
    </div>
  );
};

const AlertLog: React.FC<{ alerts: AlertMessage[]; isLoading: boolean }> = ({ alerts, isLoading }) => {
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [alerts]);

  const getAlertStyle = (type: SignalStatus) => {
    switch (type) {
      case SignalStatus.Warning:
        return 'border-l-4 border-yellow-500 bg-yellow-500/10';
      case SignalStatus.Error:
        return 'border-l-4 border-red-500 bg-red-500/10';
      default:
        return 'border-l-4 border-green-500 bg-green-500/10';
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-800 rounded-lg shadow-inner">
      <h2 className="text-xl font-bold p-4 border-b border-gray-700">Event Log</h2>
      <div className="flex-grow p-4 overflow-y-auto space-y-4">
        {alerts.map((alert) => (
          <div key={alert.id} className={`p-3 rounded-md ${getAlertStyle(alert.type)}`}>
            <div className="flex justify-between items-center text-sm mb-1">
              <span className={`font-semibold ${
                alert.type === SignalStatus.Error ? 'text-red-400' :
                alert.type === SignalStatus.Warning ? 'text-yellow-400' : 'text-green-400'
              }`}>{alert.type.toUpperCase()}</span>
              <span className="text-gray-500">{alert.timestamp}</span>
            </div>
            <p className="text-gray-300">{alert.message}</p>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-gray-400 animate-pulse">
            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Analyzing stream for anomalies...</span>
          </div>
        )}
        <div ref={logEndRef} />
      </div>
    </div>
  );
};

// --- Main App Component ---

const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [signalStatus, setSignalStatus] = useState<SignalStatus>(SignalStatus.Good);
  const [alerts, setAlerts] = useState<AlertMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

  const possibleIssues = [
    { type: SignalStatus.Warning, issue: 'Slight audio desynchronization detected on channel 3.' },
    { type: SignalStatus.Error, issue: 'Critical signal loss on primary satellite uplink.' },
    { type: SignalStatus.Warning, issue: 'Minor video artifacting (pixelation) observed during high-motion scene.' },
    { type: SignalStatus.Error, issue: 'Complete audio dropout on main program feed.' },
    { type: SignalStatus.Warning, issue: 'Loudness levels exceed EBU R128 standard by 2 LU.' },
    { type: SignalStatus.Good, issue: 'System check complete. All parameters are nominal.' }
  ];

  const generateAlert = async (issue: string, type: SignalStatus) => {
    setIsLoading(true);
    if (type !== SignalStatus.Good) {
      setSignalStatus(type);
    }

    try {
      const prompt = `You are an AI broadcast monitoring system. An anomaly has been detected.
      Describe the following issue in a concise, technical alert for a broadcast operator: "${issue}"`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const message = response.text;

      setAlerts(prev => [
        ...prev,
        {
          id: Date.now(),
          timestamp: new Date().toLocaleTimeString(),
          type: type,
          message: message,
        }
      ]);

      if(type === SignalStatus.Good) {
        setTimeout(() => setSignalStatus(SignalStatus.Good), 1000);
      }

    } catch (error) {
      console.error("Error generating alert:", error);
      setSignalStatus(SignalStatus.Error);
      setAlerts(prev => [
        ...prev,
        {
          id: Date.now(),
          timestamp: new Date().toLocaleTimeString(),
          type: SignalStatus.Error,
          message: 'Failed to get analysis from AI. Check API connection.',
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Start webcam feed
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
          }
        })
        .catch(err => {
          console.error("Error accessing webcam:", err);
          setAlerts(prev => [...prev, {
              id: Date.now(),
              timestamp: new Date().toLocaleTimeString(),
              type: SignalStatus.Error,
              message: "Webcam access denied or unavailable. Displaying placeholder background."
          }]);
        });
    }

    // Simulate new events every 8-15 seconds
    const interval = setInterval(() => {
      if (isLoading) return;
      const randomIssue = possibleIssues[Math.floor(Math.random() * possibleIssues.length)];
      generateAlert(randomIssue.issue, randomIssue.type);
    }, Math.random() * (15000 - 8000) + 8000);

    // Initial message
    setTimeout(() => {
        generateAlert("Monitoring initialized. Primary video and audio feeds are stable.", SignalStatus.Good);
    }, 1500);


    return () => clearInterval(interval);
  }, []);


  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans p-4 lg:p-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-cyan-400">AI Broadcast Monitor</h1>
        <p className="text-gray-400">Real-time integrity analysis of broadcast streams</p>
      </header>
      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8" style={{ height: 'calc(100vh - 120px)'}}>
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-black aspect-video rounded-lg shadow-lg overflow-hidden flex items-center justify-center text-gray-500">
             <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover"></video>
          </div>
          <StatusIndicator status={signalStatus} />
        </div>
        <div className="lg:col-span-1 h-full">
            <AlertLog alerts={alerts} isLoading={isLoading} />
        </div>
      </main>
    </div>
  );
};

export default App;
