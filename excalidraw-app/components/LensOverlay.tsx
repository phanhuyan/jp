/* eslint-disable no-console */
import React, { useState, useRef, useCallback } from "react";
import { exportToCanvas } from "@excalidraw/excalidraw/scene/export";

import { getCommonBounds } from "@excalidraw/element";
import { OCRIcon } from "@excalidraw/excalidraw/components/icons";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import "./LensOverlay.scss";

interface LensOverlayProps {
  excalidrawAPI: ExcalidrawImperativeAPI;
  onClose: () => void;
}

type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | null;

export const LensOverlay: React.FC<LensOverlayProps> = ({
  excalidrawAPI,
  onClose,
}) => {
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [size, setSize] = useState({ width: 400, height: 300 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle>(null);
  const [isOCRProcessing, setIsOCRProcessing] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const resizeStartRef = useRef({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    posX: 0,
    posY: 0,
  });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, handle?: ResizeHandle) => {
      e.preventDefault();
      e.stopPropagation();

      if (handle) {
        setIsResizing(true);
        setResizeHandle(handle);
        resizeStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          width: size.width,
          height: size.height,
          posX: position.x,
          posY: position.y,
        };
      } else {
        setIsDragging(true);
        dragStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          posX: position.x,
          posY: position.y,
        };
      }
    },
    [position, size],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - dragStartRef.current.x;
        const deltaY = e.clientY - dragStartRef.current.y;
        setPosition({
          x: dragStartRef.current.posX + deltaX,
          y: dragStartRef.current.posY + deltaY,
        });
      } else if (isResizing && resizeHandle) {
        const deltaX = e.clientX - resizeStartRef.current.x;
        const deltaY = e.clientY - resizeStartRef.current.y;
        const start = resizeStartRef.current;

        let newWidth = start.width;
        let newHeight = start.height;
        let newX = start.posX;
        let newY = start.posY;

        // Handle horizontal resizing
        if (resizeHandle.includes("e")) {
          newWidth = Math.max(100, start.width + deltaX);
        } else if (resizeHandle.includes("w")) {
          newWidth = Math.max(100, start.width - deltaX);
          newX = start.posX + (start.width - newWidth);
        }

        // Handle vertical resizing
        if (resizeHandle.includes("s")) {
          newHeight = Math.max(100, start.height + deltaY);
        } else if (resizeHandle.includes("n")) {
          newHeight = Math.max(100, start.height - deltaY);
          newY = start.posY + (start.height - newHeight);
        }

        setSize({ width: newWidth, height: newHeight });
        setPosition({ x: newX, y: newY });
      }
    },
    [isDragging, isResizing, resizeHandle],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
  }, []);

  React.useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  const handleCapture = useCallback(async () => {
    try {
      const appState = excalidrawAPI.getAppState();
      const allElements = excalidrawAPI.getSceneElements();
      const files = excalidrawAPI.getFiles();

      const canvasContainer = document.querySelector(".excalidraw");

      if (!canvasContainer) {
        console.error(
          "Canvas container not found. Ensure the Excalidraw component is wrapped in a div with class '.excalidraw-wrapper' or similar.",
        );
        return;
      }

      const containerRect = canvasContainer.getBoundingClientRect();

      // Calculate the lens bounds in screen coordinates relative to canvas
      const lensScreenX = position.x - containerRect.left;
      const lensScreenY = position.y - containerRect.top;

      // Convert screen coordinates to canvas coordinates
      const zoom = appState.zoom.value;
      const scrollX = appState.scrollX;
      const scrollY = appState.scrollY;

      const canvasX1 = lensScreenX / zoom - scrollX;
      const canvasY1 = lensScreenY / zoom - scrollY;
      const canvasX2 = canvasX1 + size.width / zoom;
      const canvasY2 = canvasY1 + size.height / zoom;

      // Filter elements that are within or overlap the lens bounds
      const elementsInLens = allElements.filter((element) => {
        if (element.isDeleted) {
          return false;
        }

        const [x1, y1, x2, y2] = getCommonBounds([element]);

        // Check if element overlaps with lens bounds
        return !(
          x2 < canvasX1 ||
          x1 > canvasX2 ||
          y2 < canvasY1 ||
          y1 > canvasY2
        );
      });

      if (elementsInLens.length === 0) {
        console.warn("No elements in lens area");
      }

      // Export the canvas with the filtered elements
      const canvas = await exportToCanvas(
        elementsInLens,
        {
          ...appState,
          exportScale: 2, // Higher quality export
        },
        files,
        {
          exportBackground: true,
          viewBackgroundColor: appState.viewBackgroundColor,
        },
      );

      // Download the image
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `excalidraw-lens-capture-${Date.now()}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      });
    } catch (error) {
      console.error("Error capturing lens area:", error);
    }
  }, [excalidrawAPI, position, size]);

  const handleOCR = useCallback(async () => {
    try {
      setIsOCRProcessing(true);
      const appState = excalidrawAPI.getAppState();
      const allElements = excalidrawAPI.getSceneElements();
      const files = excalidrawAPI.getFiles();

      const canvasContainer = document.querySelector(".excalidraw");

      if (!canvasContainer) {
        console.error("Canvas container not found.");
        setIsOCRProcessing(false);
        return;
      }

      const containerRect = canvasContainer.getBoundingClientRect();

      // Calculate the lens bounds in screen coordinates relative to canvas
      const lensScreenX = position.x - containerRect.left;
      const lensScreenY = position.y - containerRect.top;

      // Convert screen coordinates to canvas coordinates
      const zoom = appState.zoom.value;
      const scrollX = appState.scrollX;
      const scrollY = appState.scrollY;

      const canvasX1 = lensScreenX / zoom - scrollX;
      const canvasY1 = lensScreenY / zoom - scrollY;
      const canvasX2 = canvasX1 + size.width / zoom;
      const canvasY2 = canvasY1 + size.height / zoom;

      // Filter elements that are within or overlap the lens bounds
      const elementsInLens = allElements.filter((element) => {
        if (element.isDeleted) {
          return false;
        }

        const [x1, y1, x2, y2] = getCommonBounds([element]);

        // Check if element overlaps with lens bounds
        return !(
          x2 < canvasX1 ||
          x1 > canvasX2 ||
          y2 < canvasY1 ||
          y1 > canvasY2
        );
      });

      // Export the canvas with the filtered elements
      const canvas = await exportToCanvas(
        elementsInLens,
        {
          ...appState,
          exportScale: 2, // Higher quality export
        },
        files,
        {
          exportBackground: true,
          viewBackgroundColor: appState.viewBackgroundColor,
        },
      );

      // Convert canvas to base64
      const base64Image = canvas.toDataURL("image/jpeg").split(",")[1];

      // Send to OCR API via CORS proxy
      const response = await fetch("http://localhost:3001/ocr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          file: base64Image,
          fileType: 1,
        }),
      });

      if (!response.ok) {
        throw new Error(`OCR API error: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("=== OCR Response ===");
      console.log(data);

      // Extract recognized text from PaddleX format
      if (
        data.result &&
        data.result.ocrResults &&
        data.result.ocrResults.length > 0
      ) {
        const recTexts = data.result.ocrResults[0].prunedResult.rec_texts;
        console.log("Recognized text:");
        recTexts.forEach((text: string, index: number) => {
          console.log(`  [${index}]: ${text}`);
        });

        const allText = recTexts.join("\n");
        alert(`OCR completed!\n\nRecognized text:\n${allText}`);
      } else {
        console.log("No OCR results found");
        console.log("Full response:", JSON.stringify(data, null, 2));
        alert("OCR completed but no text was detected.");
      }
    } catch (error) {
      console.error("Error during OCR:", error);
      alert(
        `OCR failed: ${error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    } finally {
      setIsOCRProcessing(false);
    }
  }, [excalidrawAPI, position, size]);

  const renderResizeHandle = (handle: ResizeHandle) => (
    <div
      className={`lens-resize-handle lens-resize-handle-${handle}`}
      onMouseDown={(e) => handleMouseDown(e, handle)}
    />
  );

  return (
    <div
      className="lens-overlay"
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
      }}
    >
      <div className="lens-content" onMouseDown={(e) => handleMouseDown(e)}>
        <div className="lens-controls">
          <button
            className="lens-button lens-capture-button"
            onClick={handleCapture}
            title="Capture this area"
          >
            📷 Capture
          </button>
          <button
            className="lens-button lens-ocr-button"
            onClick={handleOCR}
            disabled={isOCRProcessing}
            title="Run OCR on this area"
          >
            {isOCRProcessing ? "Processing..." : <>{OCRIcon} OCR</>}
          </button>
          <button
            className="lens-button lens-close-button"
            onClick={onClose}
            title="Close lens"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Resize handles */}
      {renderResizeHandle("nw")}
      {renderResizeHandle("n")}
      {renderResizeHandle("ne")}
      {renderResizeHandle("e")}
      {renderResizeHandle("se")}
      {renderResizeHandle("s")}
      {renderResizeHandle("sw")}
      {renderResizeHandle("w")}
    </div>
  );
};
