import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'integrations'/'firstclassbot'))
from backstage_batch import check_batch

class Items:
    def __init__(self,items):self.items=items
    def count(self):return len(self.items)
    def nth(self,index):return self.items[index]
    @property
    def first(self):return self.items[0]
class Cell:
    def __init__(self,value):self.value=value
    def inner_text(self):return self.value
    def locator(self,selector):return Items([Cell(self.value.splitlines()[0])])
class Row:
    def __init__(self,name,nickname):self.cells=Items([Cell(name+'\n'+nickname),Cell('Available'),Cell('Premium')])
    def locator(self,selector):return self.cells
    def wait_for(self,**kwargs):pass
class Widget:
    def __init__(self,page,name=''):self.page=page;self.name=name
    def click(self,**kwargs):self.page.clicks.append(self.name)
    def fill(self,text):self.page.input=text
    def wait_for(self,**kwargs):pass
    def get_by_role(self,role,name,**kwargs):return Widget(self.page,name)
    def locator(self,selector):return self.page.rows
    def is_visible(self):return False
class Page:
    def __init__(self):self.rows=Items([Row('arabic_name','محمد ⭐'),Row('emoji_name','Sam ⭐👑'),Row('cyrillic_name','Алекс')]);self.clicks=[]
    def goto(self,*args,**kwargs):pass
    def get_by_role(self,role,name='',**kwargs):return Widget(self,name)
    def get_by_test_id(self,name):return Widget(self,name)
    def get_by_text(self,*args,**kwargs):return Widget(self)
    def wait_for_timeout(self,*args):pass
class Tests(unittest.TestCase):
    def test_nickname_is_checked_without_changing_available_status(self):
        page=Page();rows=check_batch(page,['emoji_name','arabic_name','cyrillic_name'])
        self.assertEqual([r['username'] for r in rows],['emoji_name','arabic_name','cyrillic_name'])
        self.assertEqual([r['excludedForName'] for r in rows],[False,True,True])
        self.assertTrue(all(r['status']=='Available' for r in rows))
        self.assertEqual(rows[1]['name'],'محمد ⭐')
        self.assertEqual(page.clicks,['Invite creators','Next'])
if __name__=='__main__':unittest.main()
