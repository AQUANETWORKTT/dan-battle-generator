"""Fixture-only tests. Never opens TikTok or sends a message."""
import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'integrations'/'firstclassbot'))
from name_filter import outside_english_letters,check_profile_name
from list_messaging import parse_names
from messaging_navigation import ChatPage,SendButton

class Nickname:
    def __init__(self,text):self.text=text
    @property
    def first(self):return self
    def wait_for(self,**kwargs):pass
    def inner_text(self,**kwargs):return self.text
class Page:
    url='https://www.tiktok.com/@alex'
    def __init__(self,text):self.text=text;self.buttons=0
    def locator(self,selector):return Nickname(self.text)
    def get_by_role(self,*args,**kwargs):self.buttons+=1;return object()
class Tests(unittest.TestCase):
    def test_letters(self):
        for text in ['José','Jose\u0301','Алекс','علي','李明','Σαμ','𝓢𝓪𝓶','Kate']:
            self.assertTrue(outside_english_letters(text),text)
        for text in ['Sam','ALEX_99','James ❤️','Lily 🏳️‍🌈','Ben 🇬🇧','123 ._-','']:
            self.assertFalse(outside_english_letters(text),text)
    def test_pasted_names_are_not_transliterated(self):
        self.assertEqual(parse_names('alex José Kate ben'),(['alex','ben'],[]))
    def test_foreign_nickname_never_opens_message_or_sends(self):
        state={'attempted':False};page=Page('José')
        with self.assertRaises(RuntimeError):ChatPage(page,'iframe',state).get_by_role('button',name='Message')
        self.assertEqual(page.buttons,0)
        self.assertIn('name_filter_blocked',state)
        with self.assertRaises(RuntimeError):SendButton(object(),state).click()
        self.assertFalse(state['attempted'])
    def test_missing_nickname_is_not_assumed_english(self):
        with self.assertRaises(RuntimeError):check_profile_name(Page(''))
    def test_ascii_with_emojis_can_continue(self):
        page=Page('Alex ❤️');ChatPage(page,'iframe',{}).get_by_role('button',name='Message')
        self.assertEqual(page.buttons,1)
if __name__=='__main__':unittest.main()
