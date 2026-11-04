"""Lettering policy only: this does not infer nationality or language."""
import unicodedata
from urllib.parse import urlsplit
import re

def outside_english_letters(*values):
    for value in values:
        previous_ascii_letter = False
        text=str(value or '').replace('ཐི༏ཋྀ','').translate({ord(c):None for c in '𖥔݁\ufe0e\ufe0f'})
        for char in text:
            category = unicodedata.category(char)
            ascii_letter = char.isascii() and char.isalpha()
            if category.startswith('L') and not ascii_letter:
                return True
            if category.startswith('M') and previous_ascii_letter:
                return True
            previous_ascii_letter = ascii_letter
    return False

def read_profile_identity(page,expected=None):
    """TikTok swaps title/subtitle roles between layouts; verify by exact handle."""
    expected=expected or urlsplit(page.url).path.removeprefix('/@').split('/')[0]
    if not re.fullmatch(r'[a-zA-Z0-9._]{1,24}',expected):
        raise RuntimeError('Profile username could not be verified.')
    values=[]
    for selector in ['[data-e2e="user-title"]','[data-e2e="user-subtitle"]']:
        field=page.locator(selector).first
        field.wait_for(state='visible',timeout=5000)
        values.append(field.inner_text(timeout=5000).strip())
    handles=[index for index,value in enumerate(values) if value.lstrip('@').lower()==expected.lower()]
    if not handles:raise RuntimeError('Profile username could not be independently verified.')
    nickname=values[1-handles[0]]
    if not nickname:raise RuntimeError('Nickname could not be verified; skipped without sending.')
    return {'username':expected,'nickname':nickname}

def check_profile_name(page,expected=None):
    """Read the verified nickname before opening Message or capturing a profile."""
    text=read_profile_identity(page,expected)['nickname']
    if outside_english_letters(text):
        raise RuntimeError('Nickname contains letters outside A-Z; skipped without sending.')
    return text
