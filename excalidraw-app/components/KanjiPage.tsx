/* eslint-disable no-console */
import React, { useState } from "react";
import { Island } from "@excalidraw/excalidraw/components/Island";
import { Button } from "@excalidraw/excalidraw/components/Button";
import { Excalidraw, exportToBlob } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import "./KanjiPage.scss";
import { useRapidOCR } from "./useRapidOCR";
import { useKanjiData, type KanjiEntry } from "./useKanjiData";
import { StrokeOrderAnimation } from "./StrokeOrderAnimation";

/**
 * Standalone Kanji learning page - Excalidraw style
 * Accessible at /kanji route.
 */
export const KanjiPage: React.FC = () => {
    const { kanjiData, isLoading: isDataLoading, error: dataError } = useKanjiData();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [hearts, setHearts] = useState(5);
    const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);

    const { processImage, isLoading: isOCRLoading } = useRapidOCR();
    const [ocrStatus, setOcrStatus] = useState<string>("");
    const [isChecking, setIsChecking] = useState(false);

    const currentKanji: KanjiEntry | undefined = kanjiData[currentIndex];
    const progress = kanjiData.length > 0 ? ((currentIndex + 1) / kanjiData.length) * 100 : 0;

    const handleClose = () => {
        window.location.href = "/";
    };

    const handleSkip = () => {
        if (excalidrawAPI) {
            excalidrawAPI.resetScene();
        }
        setOcrStatus("");
        setCurrentIndex((prev) => (prev + 1) % kanjiData.length);
    };

    const handleCheck = async () => {
        if (!excalidrawAPI || !currentKanji) return;

        const elements = excalidrawAPI.getSceneElements();
        if (elements.length === 0) {
            setOcrStatus("Draw the kanji first!");
            return;
        }

        try {
            setIsChecking(true);
            setOcrStatus("Checking...");

            const blob = await exportToBlob({
                elements,
                mimeType: "image/png",
                appState: {
                    ...excalidrawAPI.getAppState(),
                    exportWithDarkMode: false,
                    viewBackgroundColor: "#ffffff",
                },
                files: excalidrawAPI.getFiles(),
            });

            if (isOCRLoading) {
                setOcrStatus("Loading model...");
                setIsChecking(false);
                return;
            }

            const result = await processImage(blob);
            console.log("OCR Result:", result);

            if (result.includes(currentKanji.kanji)) {
                setOcrStatus("✓ Correct!");
                setTimeout(() => {
                    excalidrawAPI.resetScene();
                    setOcrStatus("");
                    setCurrentIndex((prev) => (prev + 1) % kanjiData.length);
                }, 1000);
            } else {
                setOcrStatus(`✗ Try again!`);
                setHearts((prev) => Math.max(0, prev - 1));
            }
        } catch (error: any) {
            console.error("Error checking drawing:", error);
            setOcrStatus("Error: " + error.message);
        } finally {
            setIsChecking(false);
        }
    };

    // Loading state
    if (isDataLoading) {
        return (
            <div className="KanjiPage excalidraw">
                <div className="KanjiPage__loading">Loading kanji data...</div>
            </div>
        );
    }

    // Error state
    if (dataError || !currentKanji) {
        return (
            <div className="KanjiPage excalidraw">
                <div className="KanjiPage__error">Failed to load: {dataError || "No data"}</div>
            </div>
        );
    }

    return (
        <div className="KanjiPage excalidraw">
            {/* Top Bar */}
            <div className="KanjiPage__topbar">
                <Button onSelect={handleClose} className="KanjiPage__close">✕</Button>
                <Button onSelect={() => { }} className="KanjiPage__settings">⚙</Button>
                <div className="KanjiPage__progress">
                    <div className="KanjiPage__progress-bar" style={{ width: `${progress}%` }} />
                </div>
                <div className="KanjiPage__hearts">
                    <span className="KanjiPage__heart">❤️</span>
                    <span className="KanjiPage__heart-count">{hearts}</span>
                </div>
            </div>

            {/* Main Content */}
            <div className="KanjiPage__content">
                {/* Kanji Info Box */}
                <Island className="KanjiPage__kanji-box" padding={3}>
                    <div className="KanjiPage__kanji-content">
                        <div className="KanjiPage__kanji-info">
                            <div className="KanjiPage__kanji-header">
                                <span className="KanjiPage__kanji-number">#{currentKanji.id_6th_ed}</span>
                                <span className="KanjiPage__kanji-strokes">{currentKanji.stroke_count} strokes</span>
                                {currentKanji.jlpt && <span className="KanjiPage__kanji-jlpt">{currentKanji.jlpt}</span>}
                            </div>
                            <div className="KanjiPage__kanji-main">
                                <span className="KanjiPage__kanji-char">{currentKanji.kanji}</span>
                                <span className="KanjiPage__kanji-keyword">{currentKanji.keyword_6th_ed}</span>
                            </div>
                            {currentKanji.components.length > 0 && (
                                <div className="KanjiPage__kanji-components">
                                    {currentKanji.components.slice(0, 5).map((comp, i) => (
                                        <span key={i} className="KanjiPage__component-chip">{comp}</span>
                                    ))}
                                </div>
                            )}
                            {(currentKanji.on_reading.length > 0 || currentKanji.kun_reading.length > 0) && (
                                <div className="KanjiPage__kanji-readings">
                                    {currentKanji.on_reading.length > 0 && (
                                        <span><strong>On:</strong> {currentKanji.on_reading.slice(0, 3).join(", ")}</span>
                                    )}
                                    {currentKanji.kun_reading.length > 0 && (
                                        <span><strong>Kun:</strong> {currentKanji.kun_reading.slice(0, 3).join(", ")}</span>
                                    )}
                                </div>
                            )}
                        </div>
                        {/* Stroke Order Animation Box */}
                        <StrokeOrderAnimation kanji={currentKanji.kanji} size={100} />
                    </div>
                </Island>

                {/* Drawing Board */}
                <Island className="KanjiPage__drawing-box" padding={2}>
                    <Excalidraw
                        excalidrawAPI={(api) => setExcalidrawAPI(api)}
                        viewModeEnabled={false}
                        zenModeEnabled={true}
                        gridModeEnabled={false}
                        initialData={{
                            appState: {
                                activeTool: { type: "freedraw", customType: null, locked: false, lastActiveTool: null, fromSelection: false },
                                currentItemStrokeWidth: 1,
                                penMode: true,
                                penDetected: true,
                            },
                        }}
                        UIOptions={{
                            canvasActions: {
                                changeViewBackgroundColor: false,
                                clearCanvas: false,
                                export: false,
                                loadScene: false,
                                saveToActiveFile: false,
                                toggleTheme: false,
                                saveAsImage: false,
                            },
                        }}
                    />
                    {ocrStatus && (
                        <div className={`KanjiPage__status ${ocrStatus.includes('✓') ? 'success' : ocrStatus.includes('✗') ? 'error' : ''}`}>
                            {ocrStatus}
                        </div>
                    )}
                </Island>
            </div>

            {/* Bottom Bar */}
            <div className="KanjiPage__bottombar">
                <Button onSelect={handleSkip} className="KanjiPage__skip-btn">SKIP</Button>
                <Button onSelect={handleCheck} className="KanjiPage__check-btn" disabled={isChecking}>
                    {isChecking ? "..." : "CHECK"}
                </Button>
            </div>
        </div>
    );
};
