import type { Config } from "tailwindcss";

const config: Config = {
<<<<<<< HEAD
    darkMode: ["class"],
    content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
=======
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        anthracite: {
          950: '#050505', // Obsidian black
          900: '#0A0A0B', // Deep dark
          800: '#141417', // Dark gray
          700: '#1F1F23', // Surface gray
          600: '#2A2A2F', // Border gray
          500: '#3F3F46', // Muted gray
          400: '#71717A', // Text gray
          DEFAULT: "#141417",
        },
        wood: {
          ocre:   "#C5A059", // Luxury Gold
          acajou: "#8B4513", // Rich Wood
          light:  "#E2C48D", // Sand/Champagne
          dark:   "#5D2E0D", // Deep Earth
          DEFAULT: "#C5A059",
        },
        ai: {
          glow: "#00F0FF", // Electric Cyan
          deep: "#0066FF", // Tech Blue
          nebula: "#4F46E5", // Deep Indigo
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "sans-serif"],
        display: ["var(--font-poppins)", "Poppins", "sans-serif"],
      },
      backgroundImage: {
        "hero-gradient":
          "linear-gradient(135deg, #050505 0%, #0A0A0B 50%, #1F1F23 100%)",
        "wood-gradient":
          "linear-gradient(90deg, #C5A059 0%, #8B4513 100%)",
        "card-gradient":
          "linear-gradient(145deg, #141417 0%, #1F1F23 100%)",
        "ai-gradient":
          "linear-gradient(90deg, #00F0FF 0%, #4F46E5 100%)",
        "glass-gradient":
          "linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0) 100%)",
      },
      animation: {
        "fade-in":      "fadeIn 0.6s ease-out",
        "slide-up":     "slideUp 0.5s ease-out",
        "pulse-slow":   "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "shimmer":      "shimmer 2s linear infinite",
        "progress-bar": "progressBar 2.5s ease-out forwards",
      },
      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%":   { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        progressBar: {
          "0%":   { width: "0%" },
          "100%": { width: "100%" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

>>>>>>> 1623802 (Initial commit: Archi Cam AI Premium Infrastructure)
export default config;
