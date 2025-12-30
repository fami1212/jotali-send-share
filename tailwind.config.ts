import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			success: {
  				DEFAULT: 'hsl(var(--success))',
  				foreground: 'hsl(var(--success-foreground))'
  			},
  			warning: {
  				DEFAULT: 'hsl(var(--warning))',
  				foreground: 'hsl(var(--warning-foreground))'
  			},
  			info: {
  				DEFAULT: 'hsl(var(--info))',
  				foreground: 'hsl(var(--info-foreground))'
  			},
  			purple: {
  				light: 'hsl(var(--purple-light))',
  				DEFAULT: 'hsl(var(--purple-medium))',
  				dark: 'hsl(var(--purple-dark))'
  			},
  			blue: {
  				light: 'hsl(var(--blue-light))',
  				DEFAULT: 'hsl(var(--blue-medium))',
  				dark: 'hsl(var(--blue-dark))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		backgroundImage: {
  			'gradient-primary': 'var(--gradient-primary)',
  			'gradient-secondary': 'var(--gradient-secondary)',
  			'gradient-hero': 'var(--gradient-hero)',
  			'gradient-card': 'var(--gradient-card)',
  			'gradient-accent': 'var(--gradient-accent)'
  		},
  		boxShadow: {
  			'soft': 'var(--shadow-soft)',
  			'medium': 'var(--shadow-medium)',
  			'strong': 'var(--shadow-strong)',
  			'glow': 'var(--shadow-glow)',
  			'2xs': 'var(--shadow-2xs)',
  			xs: 'var(--shadow-xs)',
  			sm: 'var(--shadow-sm)',
  			md: 'var(--shadow-md)',
  			lg: 'var(--shadow-lg)',
  			xl: 'var(--shadow-xl)',
  			'2xl': 'var(--shadow-2xl)'
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
		keyframes: {
			'accordion-down': {
				from: { height: '0' },
				to: { height: 'var(--radix-accordion-content-height)' }
			},
			'accordion-up': {
				from: { height: 'var(--radix-accordion-content-height)' },
				to: { height: '0' }
			},
			'fade-in': {
				'0%': { opacity: '0', transform: 'translateY(10px)' },
				'100%': { opacity: '1', transform: 'translateY(0)' }
			},
			'fade-out': {
				'0%': { opacity: '1', transform: 'translateY(0)' },
				'100%': { opacity: '0', transform: 'translateY(10px)' }
			},
			'scale-in': {
				'0%': { transform: 'scale(0.95)', opacity: '0' },
				'100%': { transform: 'scale(1)', opacity: '1' }
			},
			'scale-out': {
				from: { transform: 'scale(1)', opacity: '1' },
				to: { transform: 'scale(0.95)', opacity: '0' }
			},
			'slide-in-right': {
				'0%': { transform: 'translateX(100%)', opacity: '0' },
				'100%': { transform: 'translateX(0)', opacity: '1' }
			},
			'slide-out-right': {
				'0%': { transform: 'translateX(0)', opacity: '1' },
				'100%': { transform: 'translateX(100%)', opacity: '0' }
			},
			'slide-in-left': {
				'0%': { transform: 'translateX(-100%)', opacity: '0' },
				'100%': { transform: 'translateX(0)', opacity: '1' }
			},
			'slide-out-left': {
				'0%': { transform: 'translateX(0)', opacity: '1' },
				'100%': { transform: 'translateX(-100%)', opacity: '0' }
			},
			'bounce-in': {
				'0%': { transform: 'scale(0.3)', opacity: '0' },
				'50%': { transform: 'scale(1.05)' },
				'70%': { transform: 'scale(0.9)' },
				'100%': { transform: 'scale(1)', opacity: '1' }
			},
			'bounce-click': {
				'0%': { transform: 'scale(1)' },
				'40%': { transform: 'scale(0.92)' },
				'60%': { transform: 'scale(1.02)' },
				'80%': { transform: 'scale(0.98)' },
				'100%': { transform: 'scale(1)' }
			},
			'step-slide-in': {
				'0%': { opacity: '0', transform: 'translateX(30px)' },
				'100%': { opacity: '1', transform: 'translateX(0)' }
			},
			'step-slide-out': {
				'0%': { opacity: '1', transform: 'translateX(0)' },
				'100%': { opacity: '0', transform: 'translateX(-30px)' }
			}
		},
		animation: {
			'accordion-down': 'accordion-down 0.2s ease-out',
			'accordion-up': 'accordion-up 0.2s ease-out',
			'fade-in': 'fade-in 0.3s ease-out',
			'fade-out': 'fade-out 0.3s ease-out',
			'scale-in': 'scale-in 0.2s ease-out',
			'scale-out': 'scale-out 0.2s ease-out',
			'slide-in-right': 'slide-in-right 0.3s ease-out',
			'slide-out-right': 'slide-out-right 0.3s ease-out',
			'slide-in-left': 'slide-in-left 0.3s ease-out',
			'slide-out-left': 'slide-out-left 0.3s ease-out',
			'bounce-in': 'bounce-in 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
			'bounce-click': 'bounce-click 0.3s ease-out',
			'step-slide-in': 'step-slide-in 0.4s ease-out',
			'step-slide-out': 'step-slide-out 0.3s ease-out',
			'enter': 'fade-in 0.3s ease-out, scale-in 0.2s ease-out',
			'exit': 'fade-out 0.3s ease-out, scale-out 0.2s ease-out'
		},
  		fontFamily: {
  			sans: [
  				'Work Sans',
  				'ui-sans-serif',
  				'system-ui',
  				'-apple-system',
  				'BlinkMacSystemFont',
  				'Segoe UI',
  				'Roboto',
  				'Helvetica Neue',
  				'Arial',
  				'Noto Sans',
  				'sans-serif'
  			],
  			serif: [
  				'Lora',
  				'ui-serif',
  				'Georgia',
  				'Cambria',
  				'Times New Roman',
  				'Times',
  				'serif'
  			],
  			mono: [
  				'Inconsolata',
  				'ui-monospace',
  				'SFMono-Regular',
  				'Menlo',
  				'Monaco',
  				'Consolas',
  				'Liberation Mono',
  				'Courier New',
  				'monospace'
  			]
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
