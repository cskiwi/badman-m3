import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

export const BadmanPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: 'oklch(0.95 0.05 210)',
      100: 'oklch(0.92 0.08 210)',
      200: 'oklch(0.88 0.10 210)',
      300: 'oklch(0.85 0.12 210)',
      400: 'oklch(0.82 0.14 210)',
      500: 'oklch(0.78 0.15 210)',
      600: 'oklch(0.68 0.14 210)',
      700: 'oklch(0.58 0.13 210)',
      800: 'oklch(0.48 0.12 210)',
      900: 'oklch(0.38 0.10 210)',
      950: 'oklch(0.28 0.08 210)',
    },
    borderRadius: {
      none: '0',
      xs: '2px',
      sm: '4px',
      md: '8px',
      lg: '12px',
      xl: '20px',
    },
    colorScheme: {
      light: {
        primary: {
          color: 'oklch(0.58 0.17 210)',
          contrastColor: 'oklch(1 0 0)',
          hoverColor: 'oklch(0.52 0.17 210)',
          activeColor: 'oklch(0.48 0.17 210)',
        },
        surface: {
          0: 'oklch(1 0 0)',
          50: 'oklch(0.985 0.003 250)',
          100: 'oklch(0.97 0.005 250)',
          200: 'oklch(0.93 0.008 250)',
          300: 'oklch(0.87 0.01 250)',
          400: 'oklch(0.70 0.01 250)',
          500: 'oklch(0.55 0.015 250)',
          600: 'oklch(0.42 0.02 250)',
          700: 'oklch(0.30 0.025 250)',
          800: 'oklch(0.20 0.02 250)',
          900: 'oklch(0.14 0.02 250)',
          950: 'oklch(0.10 0.02 250)',
        },
        highlight: {
          background: 'oklch(0.58 0.17 210 / 0.12)',
          focusBackground: 'oklch(0.58 0.17 210 / 0.2)',
          color: 'oklch(0.48 0.17 210)',
          focusColor: 'oklch(0.38 0.17 210)',
        },
        text: {
          color: 'oklch(0.14 0.02 250)',
          hoverColor: 'oklch(0.10 0.02 250)',
          mutedColor: 'oklch(0.55 0.015 250)',
          hoverMutedColor: 'oklch(0.42 0.02 250)',
        },
      },
      dark: {
        primary: {
          color: 'oklch(0.78 0.15 210)',
          contrastColor: 'oklch(0.14 0.02 250)',
          hoverColor: 'oklch(0.85 0.15 210)',
          activeColor: 'oklch(0.72 0.14 210)',
        },
        // NOTE: This surface scale is INVERTED vs. the typical Aura
        // convention (0 = darkest, 950 = lightest) so Tailwind utility
        // classes like `bg-surface-900` keep the same semantic meaning
        // in both modes (always "a surface tinted toward the opposite
        // end of the page background"). Because of this inversion,
        // component tokens that Aura maps to `{surface.950}` in dark
        // mode (e.g. form-field background) must be overridden below
        // to pull from the low end of our scale instead.
        surface: {
          0: 'oklch(0.14 0.02 250)',
          50: 'oklch(0.17 0.02 250)',
          100: 'oklch(0.20 0.02 250)',
          200: 'oklch(0.24 0.025 250)',
          300: 'oklch(0.30 0.025 250)',
          400: 'oklch(0.42 0.02 250)',
          500: 'oklch(0.55 0.015 250)',
          600: 'oklch(0.68 0.012 250)',
          700: 'oklch(0.78 0.01 250)',
          800: 'oklch(0.88 0.008 250)',
          900: 'oklch(0.94 0.005 250)',
          950: 'oklch(0.98 0.003 250)',
        },
        text: {
          color: 'oklch(0.94 0.005 250)',
          hoverColor: 'oklch(0.98 0.003 250)',
          mutedColor: 'oklch(0.68 0.012 250)',
          hoverMutedColor: 'oklch(0.78 0.01 250)',
        },
        highlight: {
          background: 'oklch(0.78 0.15 210 / 0.16)',
          focusBackground: 'oklch(0.78 0.15 210 / 0.24)',
          color: 'oklch(0.88 0.10 210)',
          focusColor: 'oklch(0.94 0.05 210)',
        },
        content: {
          background: '{surface.50}',
          hoverBackground: '{surface.100}',
          borderColor: '{surface.200}',
          color: '{text.color}',
          hoverColor: '{text.hoverColor}',
        },
        formField: {
          background: '{surface.50}',
          disabledBackground: '{surface.100}',
          filledBackground: '{surface.100}',
          filledHoverBackground: '{surface.200}',
          filledFocusBackground: '{surface.50}',
          borderColor: '{surface.300}',
          hoverBorderColor: '{surface.400}',
          focusBorderColor: '{primary.color}',
          invalidBorderColor: '{red.400}',
          color: '{text.color}',
          disabledColor: '{text.mutedColor}',
          placeholderColor: '{text.mutedColor}',
          floatLabelColor: '{text.mutedColor}',
          floatLabelFocusColor: '{primary.color}',
          floatLabelActiveColor: '{text.mutedColor}',
          floatLabelInvalidColor: '{form.field.invalid.placeholder.color}',
          iconColor: '{text.mutedColor}',
          shadow: 'none',
        },
        // Overlays (autocomplete dropdown, popover, modal) default to
        // `{surface.900}` in Aura dark — which is the LIGHTEST surface
        // in our inverted scale. Remap to the dark end.
        overlay: {
          select: {
            background: '{surface.50}',
            borderColor: '{surface.200}',
            color: '{text.color}',
          },
          popover: {
            background: '{surface.50}',
            borderColor: '{surface.200}',
            color: '{text.color}',
          },
          modal: {
            background: '{surface.50}',
            borderColor: '{surface.200}',
            color: '{text.color}',
          },
        },
        // List options (inside dropdowns/listbox) — the focus/hover
        // background defaults to `{surface.800}` which is near-white
        // in our inverted scale.
        list: {
          option: {
            focusBackground: '{surface.100}',
            selectedBackground: '{highlight.background}',
            selectedFocusBackground: '{highlight.focusBackground}',
            color: '{text.color}',
            focusColor: '{text.hoverColor}',
            selectedColor: '{highlight.color}',
            selectedFocusColor: '{highlight.focusColor}',
          },
        },
        // Navigation (menu/tieredmenu/menubar/contextmenu) items —
        // default focus background `{surface.800}` is near-white in
        // our inverted scale.
        navigation: {
          item: {
            focusBackground: '{surface.100}',
            color: '{text.color}',
            focusColor: '{text.hoverColor}',
            icon: {
              color: '{text.mutedColor}',
              focusColor: '{text.hoverColor}',
            },
          },
          submenuLabel: {
            background: 'transparent',
            color: '{text.mutedColor}',
          },
        },
      },
    },
  },
  // Component-level overrides — Aura's dark ToggleButton (used
  // internally by p-selectbutton) defaults to `{surface.950}` for
  // background/border, which in our inverted dark.surface scale is
  // the LIGHTEST color. Remap it to the dark end of the scale.
  components: {
    // Aura's dark Button outlined/text "secondary" variant defaults to
    // `{surface.400}` for the foreground, which in our inverted dark
    // surface scale is a mid-dark gray — producing dark-on-dark text.
    // Remap to semantic text tokens so the label stays legible.
    button: {
      colorScheme: {
        dark: {
          outlined: {
            secondary: {
              color: '{text.muted.color}',
              borderColor: '{surface.300}',
              hoverBackground: '{surface.100}',
              activeBackground: '{surface.200}',
            },
          },
          text: {
            secondary: {
              color: '{text.muted.color}',
              hoverBackground: '{surface.100}',
              activeBackground: '{surface.200}',
            },
          },
        },
      },
    },
    togglebutton: {
      colorScheme: {
        dark: {
          root: {
            background: '{surface.50}',
            checkedBackground: '{surface.50}',
            hoverBackground: '{surface.100}',
            borderColor: '{surface.300}',
            color: '{surface.600}',
            hoverColor: '{surface.700}',
            checkedColor: '{surface.950}',
            checkedBorderColor: '{surface.300}',
          },
          content: {
            checkedBackground: '{surface.200}',
          },
          icon: {
            color: '{surface.600}',
            hoverColor: '{surface.700}',
            checkedColor: '{surface.950}',
          },
        },
      },
    },
  },
});
