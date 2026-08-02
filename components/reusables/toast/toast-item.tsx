"use client";

import React, { useState, useEffect } from "react";
import { ToastItemProps } from "./types";

// Individual toast component that displays a single notification with animations
export const ToastItem: React.FC<ToastItemProps> = React.memo(
  ({ toast, onDismiss, onPause, onResume }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isExiting, setIsExiting] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    // Handle enter animation on mount
    useEffect(() => {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 10); // Small delay to ensure DOM is ready

      return () => clearTimeout(timer);
    }, []);

    // Handle hover pause/resume functionality
    useEffect(() => {
      if (toast.duration > 0) {
        // Only handle pause/resume for toasts with auto-dismiss
        if (isHovered) {
          onPause(toast.id);
        } else {
          onResume(toast.id);
        }
      }
    }, [isHovered, toast.id, toast.duration, onPause, onResume]);

    // Cleanup on unmount to prevent memory leaks
    useEffect(() => {
      return () => {
        setIsVisible(false);
        setIsExiting(false);
        setIsHovered(false);
      };
    }, []);

    // Handle click to dismiss toast with exit animation
    const handleClick = () => {
      try {
        setIsExiting(true);
        // Wait for exit animation to complete before removing
        setTimeout(() => {
          onDismiss(toast.id);
        }, 300);
      } catch (error) {
        console.warn("Failed to dismiss toast:", error);
        // Fallback: dismiss immediately if animation fails
        onDismiss(toast.id);
      }
    };

    // Get type-specific icon and color
    const getTypeIcon = () => {
      switch (toast.type) {
        case "success":
          return {
            icon: (
              <svg
                width="16"
                height="16"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M23.7719 10.8135C23.9526 10.9945 24.0542 11.2398 24.0542 11.4955C24.0542 11.7513 23.9526 11.9966 23.7719 12.1776L14.764 21.1855C14.583 21.3663 14.3377 21.4678 14.0819 21.4678C13.8262 21.4678 13.5809 21.3663 13.3999 21.1855L8.25249 16.0381C8.15767 15.9498 8.08161 15.8432 8.02886 15.7248C7.97611 15.6064 7.94775 15.4786 7.94546 15.349C7.94318 15.2194 7.96701 15.0907 8.01556 14.9705C8.0641 14.8504 8.13635 14.7412 8.22799 14.6496C8.31964 14.5579 8.42881 14.4857 8.54899 14.4371C8.66916 14.3886 8.79789 14.3647 8.92748 14.367C9.05707 14.3693 9.18487 14.3977 9.30326 14.4504C9.42165 14.5032 9.5282 14.5792 9.61655 14.6741L14.0819 19.1394L22.4078 10.8135C22.5888 10.6328 22.8341 10.5313 23.0899 10.5313C23.3456 10.5312 23.5909 10.6328 23.7719 10.8135Z"
                  fill="currentColor"
                />
              </svg>
            ),
            color: "text-emerald-500",
          };
        case "error":
          return {
            icon: (
              <svg
                width="16"
                height="16"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M11.2852 20.7138L20.7145 11.2871M11.2852 11.2871L20.7145 20.7138"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            ),
            color: "text-rose-500",
          };
        case "warning":
          return {
            icon: (
              <svg
                width="16"
                height="16"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M15.9941 11.3164C16.8754 11.3164 17.5898 10.602 17.5898 9.7207C17.5898 8.83942 16.8754 8.125 15.9941 8.125C15.1129 8.125 14.3984 8.83942 14.3984 9.7207C14.3984 10.602 15.1129 11.3164 15.9941 11.3164Z"
                  fill="currentColor"
                />
                <path
                  d="M14.9094 12.8196H17.0905V21.5442H14.9094V12.8196Z"
                  fill="currentColor"
                />
              </svg>
            ),
            color: "text-orange-500",
          };
        case "info":
          return {
            icon: (
              <svg
                width="16"
                height="16"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M15.9941 11.3164C16.8754 11.3164 17.5898 10.602 17.5898 9.7207C17.5898 8.83942 16.8754 8.125 15.9941 8.125C15.1129 8.125 14.3984 8.83942 14.3984 9.7207C14.3984 10.602 15.1129 11.3164 15.9941 11.3164Z"
                  fill="currentColor"
                />
                <path
                  d="M14.9094 12.8196H17.0905V21.5442H14.9094V12.8196Z"
                  fill="currentColor"
                />
              </svg>
            ),
            color: "text-sky-500",
          };
        case "default":
        default:
          return null; // No icon for default type
      }
    };

    // Get animation classes based on position and state with hardware acceleration
    const getAnimationClasses = () => {
      const isRightPosition = toast.position.includes("right");

      if (isExiting) {
        return `
        opacity-0 
        ${isRightPosition ? "translate-x-full" : "-translate-x-full"} 
        transition-all 
        duration-300 
        ease-in
        transform-gpu
      `;
      }

      if (isVisible) {
        return `
        opacity-100 
        translate-x-0 
        transition-all 
        duration-200 
        ease-out
        transform-gpu
        motion-reduce:transition-none
        motion-reduce:transform-none
      `;
      }

      return `
      opacity-0 
      ${isRightPosition ? "translate-x-full" : "-translate-x-full"} 
      transition-all 
      duration-200 
      ease-out
      transform-gpu
      motion-reduce:transition-none
      motion-reduce:transform-none
    `;
    };

    return (
      <div
        className={`
        bg-bk-60 
        border 
        border-bd-40 
        rounded-lg 
        shadow-sm 
        px-2.5 
        py-2.5 
        min-w-[200px] 
        w-full
        sm:w-auto
        sm:max-w-[450px] 
        cursor-pointer 
        focus:outline-none
        transform
        relative
        group
        ${getAnimationClasses()}
      `}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            handleClick();
          }
        }}
        tabIndex={0}
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        aria-label={`${
          toast.type === "default" ? "Notification" : toast.type
        } notification: ${
          toast.message
        }. Press Enter, Space, or Escape to dismiss.`}
      >
        <div className="flex items-center gap-1">
          {/* Type icon - only show for non-default types */}
          {getTypeIcon() && (
            <div className={`flex-shrink-0 ${getTypeIcon()?.color}`}>
              {getTypeIcon()?.icon}
            </div>
          )}

          {/* Message content */}
          <div className="flex-1 flex items-center justify-between gap-2">
            <div
              className="text-fg-50 group-hover:text-fg-50 text-[11px] tracking-tight leading-tight flex-1 transition-colors duration-200"
              style={{ fontSize: "11px", letterSpacing: "-0.025em" }}
            >
              {toast.message}
            </div>

            {/* Cross icon - only visible on hover */}
            <button
              className="opacity-0 group-hover:opacity-100 text-fg-70 group-hover:text-fg-50 cursor-pointer p-1 -m-1 transition-all duration-200 flex-shrink-0 rounded flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation();
                handleClick();
              }}
              aria-label="Dismiss notification"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="10"
                height="10"
                viewBox="0 0 20 20"
              >
                <path
                  fill="currentColor"
                  d="m4.089 4.216l.057-.07a.5.5 0 0 1 .638-.057l.07.057L10 9.293l5.146-5.147a.5.5 0 0 1 .638-.057l.07.057a.5.5 0 0 1 .057.638l-.057.07L10.707 10l5.147 5.146a.5.5 0 0 1 .057.638l-.057.07a.5.5 0 0 1-.638.057l-.07-.057L10 10.707l-5.146 5.147a.5.5 0 0 1-.638.057l-.07-.057a.5.5 0 0 1-.057-.638l.057.07L9.293 10L4.146 4.854a.5.5 0 0 1-.057-.638l.057-.07z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  },
);

// Add display name for better debugging
ToastItem.displayName = "ToastItem";
