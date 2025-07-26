'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Database, FolderOpen, Target, History, Settings, Download, Bug } from 'lucide-react';

interface AnimatedTabProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  index: number;
  isDeveloperMode: boolean;
}

interface AnimatedTabsProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  isDeveloperMode?: boolean;
}

const regularTabs = [
  { id: 'source', label: 'Zdrojová složka', icon: <FolderOpen className="h-4 w-4" /> },
  { id: 'targets', label: 'Cílové lokace', icon: <Target className="h-4 w-4" /> },
  { id: 'copy', label: 'Kopírování', icon: <Database className="h-4 w-4" /> },
  { id: 'history', label: 'Historie', icon: <History className="h-4 w-4" /> },
  { id: 'settings', label: 'Nastavení', icon: <Settings className="h-4 w-4" /> }
];

const developerTabs = [
  { id: 'updates', label: 'Aktualizace aplikace', icon: <Download className="h-4 w-4" /> },
  { id: 'crash-reporting', label: 'Hlášení chyb', icon: <Bug className="h-4 w-4" /> }
];

function AnimatedTab({ id, label, icon, isActive, onClick, index, isDeveloperMode }: AnimatedTabProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: -20 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        transition: {
          duration: 0.5,
          delay: index * 0.1,
          ease: [0.6, -0.05, 0.01, 0.99]
        }
      }}
      whileHover={{ 
        scale: 1.05,
        transition: { duration: 0.2 }
      }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`
        relative px-6 py-3 rounded-xl font-medium text-sm transition-all duration-300
        flex items-center gap-2 min-w-[120px] justify-center
        ${isActive 
          ? 'text-white shadow-lg shadow-red-500/25' 
          : 'text-gray-400 hover:text-gray-200'
        }
      `}
    >
      {/* Background with smooth transition */}
      <motion.div
        layoutId={`activeTab-${isDeveloperMode ? 'dev' : 'user'}`}
        className={`
          absolute inset-0 rounded-xl
          ${isActive 
            ? 'bg-gradient-to-r from-red-500 to-red-600' 
            : 'bg-transparent'
          }
        `}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30
        }}
      />
      
      {/* Hover background */}
      {!isActive && (
        <motion.div
          className="absolute inset-0 rounded-xl bg-gray-700/30"
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        />
      )}
      
      {/* Content */}
      <div className="relative z-10 flex items-center gap-2">
        <motion.div
          animate={isActive ? { 
            rotate: [0, -10, 10, 0],
            scale: [1, 1.1, 1]
          } : {}}
          transition={{ 
            duration: 0.6,
            ease: "easeInOut"
          }}
        >
          {icon}
        </motion.div>
        <span>{label}</span>
      </div>
      
      {/* Active indicator */}
      {isActive && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full"
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 30,
            delay: 0.1
          }}
        />
      )}
    </motion.button>
  );
}

export function AnimatedTabs({ activeTab, onTabChange, isDeveloperMode = false }: AnimatedTabsProps) {
  const visibleTabs = isDeveloperMode ? [...regularTabs, ...developerTabs] : regularTabs;
  
  // Create a unique key based on visible tabs to force re-render when tabs change
  const tabsKey = `${isDeveloperMode ? 'dev' : 'user'}-${visibleTabs.length}`;
  
  return (
    <div className="flex justify-center mb-6">
      <motion.div 
        key={tabsKey}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ 
          opacity: 1, 
          scale: 1,
          transition: {
            duration: 0.6,
            ease: [0.6, -0.05, 0.01, 0.99]
          }
        }}
        className="relative bg-gray-800/50 backdrop-blur-sm rounded-2xl p-1.5 border border-gray-700/50 shadow-lg"
      >
        {/* Animated glow effect */}
        <motion.div
          animate={{
            opacity: [0.5, 0.8, 0.5],
            scale: [1, 1.02, 1]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute inset-0 rounded-2xl bg-gradient-to-r from-red-500/10 to-red-600/10 blur-sm"
        />
        
        <div className="flex relative">
          {visibleTabs.map((tab, index) => (
            <AnimatedTab
              key={tab.id}
              id={tab.id}
              label={tab.label}
              icon={tab.icon}
              isActive={activeTab === tab.id}
              onClick={() => onTabChange(tab.id)}
              index={index}
              isDeveloperMode={isDeveloperMode}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
