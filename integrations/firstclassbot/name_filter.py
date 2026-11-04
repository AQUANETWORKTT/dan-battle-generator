"""Lettering policy only: this does not infer nationality or language."""
import unicodedata

def outside_english_letters(*values):
    for value in values:
        previous_ascii_letter = False
        for char in str(value or ''):
            category = unicodedata.category(char)
            ascii_letter = char.isascii() and char.isalpha()
            if category.startswith('L') and not ascii_letter:
                return True
            if category.startswith('M') and previous_ascii_letter:
                return True
            previous_ascii_letter = ascii_letter
    return False

def check_profile_name(page):
    """Read the current profile nickname before opening its message button."""
    nickname = page.locator('[data-e2e="user-subtitle"]').first
    nickname.wait_for(state='visible', timeout=5000)
    text = nickname.inner_text(timeout=5000).strip()
    if not text:
        raise RuntimeError('Nickname could not be verified; skipped without sending.')
    if outside_english_letters(text):
        raise RuntimeError('Nickname contains letters outside A-Z; skipped without sending.')
    return text
