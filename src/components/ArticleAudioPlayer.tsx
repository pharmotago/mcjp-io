"use client";

import React, { useState, useEffect, useRef } from "react";

interface ArticleAudioPlayerProps {
  title: string;
  content: string;
}

export default function ArticleAudioPlayer({ title, content }: ArticleAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [supported, setSupported] = useState(false);
  const [progress, setProgress] = useState(0);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const cleanTextRef = useRef<string>("");

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      setSupported(true);

      // Clean markdown formatting for natural TTS reading
      const clean = content
        .replace(/!\[.*?\]\(.*?\)/g, '') // remove images
        .replace(/\[(.*?)\]\(.*?\)/g, '$1') // link text only
        .replace(/#{1,6}\s+/g, '') // headers
        .replace(/(\*\*|\*|`|_{1,2})/g, '') // markdown bold/italic/code
        .replace(/>\s+\[!.*?\]/g, '') // callout tags
        .replace(/[-*]\s+/g, '') // lists
        .replace(/---/g, '')
        .trim();

      cleanTextRef.current = `${title}. ${clean}`;
    }

    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [title, content]);

  const handlePlayPause = () => {
    if (!supported) return;

    const synth = window.speechSynthesis;

    if (isPlaying && !isPaused) {
      synth.pause();
      setIsPaused(true);
      return;
    }

    if (isPaused) {
      synth.resume();
      setIsPaused(false);
      return;
    }

    // Cancel any ongoing speech
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanTextRef.current);
    utterance.rate = playbackRate;
    utterance.pitch = 1.0;

    // Pick best English voice if available
    const voices = synth.getVoices();
    const naturalVoice = voices.find(v => 
      v.lang.startsWith("en") && (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Samantha") || v.name.includes("Daniel"))
    ) || voices.find(v => v.lang.startsWith("en"));

    if (naturalVoice) utterance.voice = naturalVoice;

    utterance.onboundary = (e) => {
      if (e.charIndex && cleanTextRef.current.length > 0) {
        const percent = Math.min(100, Math.round((e.charIndex / cleanTextRef.current.length) * 100));
        setProgress(percent);
      }
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
      setProgress(100);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utteranceRef.current = utterance;
    synth.speak(utterance);
    setIsPlaying(true);
    setIsPaused(false);
  };

  const handleRateChange = () => {
    const rates = [1.0, 1.25, 1.5, 2.0];
    const nextIndex = (rates.indexOf(playbackRate) + 1) % rates.length;
    const newRate = rates[nextIndex];
    setPlaybackRate(newRate);

    if (isPlaying && !isPaused) {
      // Re-trigger with new rate from current position or restart
      window.speechSynthesis.cancel();
      handlePlayPause();
    }
  };

  if (!supported) return null;

  return (
    <div className="my-6 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-linear-to-r from-slate-50 to-amber-50/30 dark:from-slate-900/60 dark:to-amber-950/20 shadow-xs flex flex-wrap items-center justify-between gap-4">
      {/* Left: Player status */}
      <div className="flex items-center gap-3">
        <button
          onClick={handlePlayPause}
          className="w-10 h-10 rounded-full bg-amber-600 hover:bg-amber-500 text-white flex items-center justify-center transition-transform active:scale-95 shadow-xs cursor-pointer"
          title={isPlaying && !isPaused ? "Pause audio" : "Listen to article"}
        >
          {isPlaying && !isPaused ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-wider uppercase text-amber-800 dark:text-amber-400">
              {isPlaying && !isPaused ? "Now Listening" : isPaused ? "Audio Paused" : "Listen to Article"}
            </span>
            {isPlaying && !isPaused && (
              <span className="flex items-center gap-0.5">
                <span className="w-1 h-3 bg-amber-500 rounded-full animate-pulse"></span>
                <span className="w-1 h-4 bg-amber-600 rounded-full animate-pulse delay-75"></span>
                <span className="w-1 h-2 bg-amber-500 rounded-full animate-pulse delay-150"></span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isPlaying ? `${progress}% completed` : "AI Voice Narration"}
          </p>
        </div>
      </div>

      {/* Right: Controls & Speed */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleRateChange}
          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-amber-500 transition-colors cursor-pointer shadow-2xs"
          title="Playback speed"
        >
          {playbackRate}x
        </button>
      </div>

      {/* Progress Line */}
      {isPlaying && (
        <div className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mt-1">
          <div
            className="h-full bg-amber-600 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
