"""Builds public/data/places.json: all 64 districts + 494 upazilas of Bangladesh, and the rice variety list.

Upazila source: nuhil/bangladesh-geocode (MIT), https://github.com/nuhil/bangladesh-geocode
  python scripts/gen-places.py            # downloads the three source files
Keeps Zoha's 16 original upazilas and 18 original varieties exactly (codes, names, tags), so saved profiles
and seeded demo cases keep working. Region per upazila is APPROXIMATE (assigned by district), see NOTE.
"""

import json
import re
import urllib.request
from collections import Counter
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "public/data/places.json"
SRC = "https://raw.githubusercontent.com/nuhil/bangladesh-geocode/master/{0}/{0}.json"


def load(name: str) -> list[dict]:
    with urllib.request.urlopen(SRC.format(name), timeout=60) as r:
        data = json.loads(r.read().decode("utf-8"))
    # phpMyAdmin export: [header, database, {"type": "table", "data": [...]}]
    return next(x["data"] for x in data if isinstance(x, dict) and x.get("type") == "table")


EN_FIX = {"Coxsbazar": "Cox's Bazar", "Comilla": "Cumilla", "Barisal": "Barishal", "Jhalakathi": "Jhalokati"}
HAOR = {"Sunamganj", "Habiganj", "Moulvibazar", "Sylhet", "Kishoreganj", "Netrokona", "Brahmanbaria"}
COASTAL = {"Bagerhat", "Barguna", "Bhola", "Chattogram", "Coxsbazar", "Feni", "Khulna", "Lakshmipur", "Noakhali", "Patuakhali", "Pirojpur", "Satkhira"}
BARIND = {"Rajshahi", "Naogaon", "Chapainawabganj"}
NORTH_DIVISIONS = {"Rajshahi", "Rangpur"}


def region(district: str) -> str:
    return "haor" if district in HAOR else "coastal" if district in COASTAL else "barind" if district in BARIND else "floodplain"


def slug(s: str) -> str:
    return re.sub(r"[^A-Z0-9]+", "-", s.upper()).strip("-")


# Zoha's original 16 upazilas: (source district, source upazila name) -> exact original entry.
def orig(code, en, bn, reg, north):
    return {"code": code, "en": en, "bn": bn, "region": reg, "north": north}


ORIGINAL = {
    ("Sirajganj", "Sirajganj Sadar"): orig("SRJ-SIRAJGANJ", "Sirajganj Sadar, Sirajganj", "সিরাজগঞ্জ সদর, সিরাজগঞ্জ", "floodplain", True),
    ("Sirajganj", "Kazipur"): orig("SRJ-KAZIPUR", "Kazipur, Sirajganj", "কাজীপুর, সিরাজগঞ্জ", "floodplain", True),
    ("Sirajganj", "Chauhali"): orig("SRJ-CHAUHALI", "Chauhali, Sirajganj", "চৌহালী, সিরাজগঞ্জ", "floodplain", True),
    ("Bogura", "Shariakandi"): orig("BOG-SARIAKANDI", "Sariakandi, Bogura", "সারিয়াকান্দি, বগুড়া", "floodplain", True),
    ("Gaibandha", "Phulchari"): orig("GAI-FULCHHARI", "Fulchhari, Gaibandha", "ফুলছড়ি, গাইবান্ধা", "floodplain", True),
    ("Kurigram", "Chilmari"): orig("KUR-CHILMARI", "Chilmari, Kurigram", "চিলমারী, কুড়িগ্রাম", "floodplain", True),
    ("Jamalpur", "Islampur"): orig("JAM-ISLAMPUR", "Islampur, Jamalpur", "ইসলামপুর, জামালপুর", "floodplain", False),
    ("Feni", "Parshuram"): orig("FEN-PARSHURAM", "Parshuram, Feni", "পরশুরাম, ফেনী", "floodplain", False),
    ("Comilla", "Burichang"): orig("COM-BURICHANG", "Burichang, Cumilla", "বুড়িচং, কুমিল্লা", "floodplain", False),
    ("Sunamganj", "Tahirpur"): orig("SUN-TAHIRPUR", "Tahirpur, Sunamganj", "তাহিরপুর, সুনামগঞ্জ", "haor", False),
    ("Kishoreganj", "Itna"): orig("KIS-ITNA", "Itna, Kishoreganj", "ইটনা, কিশোরগঞ্জ", "haor", False),
    ("Satkhira", "Shyamnagar"): orig("SAT-SHYAMNAGAR", "Shyamnagar, Satkhira", "শ্যামনগর, সাতক্ষীরা", "coastal", False),
    ("Khulna", "Dakop"): orig("KHU-DACOPE", "Dacope, Khulna", "দাকোপ, খুলনা", "coastal", False),
    ("Patuakhali", "Kalapara"): orig("PAT-KALAPARA", "Kalapara, Patuakhali", "কলাপাড়া, পটুয়াখালী", "coastal", False),
    ("Rajshahi", "Godagari"): orig("RAJ-GODAGARI", "Godagari, Rajshahi", "গোদাগাড়ী, রাজশাহী", "barind", True),
    ("Naogaon", "Porsha"): orig("NAO-PORSHA", "Porsha, Naogaon", "পোরশা, নওগাঁ", "barind", True),
}
# Placeholder codes from commit fbe7d78 (used in e2e/golden.spec.ts, maybe saved on phones) -> real upazilas.
ALIASES = {"SIR": "SRJ-SIRAJGANJ", "HAO": "SUN-TAHIRPUR", "COA": "KHULNA-KOYRA", "BAR": "CHAPAINAWABGANJ-NACHOL"}

# Zoha's original 18 varieties, exactly: id, en, bn, type, season, flag.
ORIGINAL_VARIETIES = [
    ("unknown", "Local / don't know", "স্থানীয় / জানি না", "unknown", None, None),
    ("BR11", "BR11", "বিআর১১", "conventional", "aman", None),
    ("BR22", "BR22", "বিআর২২", "conventional", "aman", None),
    ("BR23", "BR23", "বিআর২৩", "conventional", "aman", None),
    ("BRRI dhan34", "BRRI dhan34", "ব্রি ধান৩৪", "conventional", "aman", None),
    ("BRRI dhan49", "BRRI dhan49", "ব্রি ধান৪৯", "conventional", "aman", None),
    ("BRRI dhan87", "BRRI dhan87", "ব্রি ধান৮৭", "conventional", "aman", None),
    ("BRRI dhan51", "BRRI dhan51 (flood-tolerant)", "ব্রি ধান৫১ (বন্যা-সহনশীল)", "sub1", "aman", None),
    ("BRRI dhan52", "BRRI dhan52 (flood-tolerant)", "ব্রি ধান৫২ (বন্যা-সহনশীল)", "sub1", "aman", None),
    ("BRRI dhan79", "BRRI dhan79 (flood-tolerant)", "ব্রি ধান৭৯ (বন্যা-সহনশীল)", "sub1", "aman", None),
    ("BINA dhan11", "BINA dhan11 (flood-tolerant)", "বিনা ধান১১ (বন্যা-সহনশীল)", "sub1", "aman", None),
    ("BINA dhan12", "BINA dhan12 (flood-tolerant)", "বিনা ধান১২ (বন্যা-সহনশীল)", "sub1", "aman", None),
    ("BRRI dhan56", "BRRI dhan56 (drought-tolerant)", "ব্রি ধান৫৬ (খরা-সহনশীল)", "conventional", "aman", "drought"),
    ("BRRI dhan71", "BRRI dhan71 (drought-tolerant)", "ব্রি ধান৭১ (খরা-সহনশীল)", "conventional", "aman", "drought"),
    ("BRRI dhan28", "BRRI dhan28", "ব্রি ধান২৮", "conventional", "boro", None),
    ("BRRI dhan29", "BRRI dhan29", "ব্রি ধান২৯", "conventional", "boro", None),
    ("BRRI dhan97", "BRRI dhan97 (salt-tolerant)", "ব্রি ধান৯৭ (লবণ-সহনশীল)", "conventional", "boro", "salt"),
    ("BRRI dhan99", "BRRI dhan99 (salt-tolerant)", "ব্রি ধান৯৯ (লবণ-সহনশীল)", "conventional", "boro", "salt"),
]
SALT_VERIFIED = {"BRRI dhan47", "BRRI dhan61", "BRRI dhan67"}  # docs/knowledge: bd_salt_varieties
VARIETY_ALIASES = {"dhan52": "BRRI dhan52", "dhan49": "BRRI dhan49", "local": "unknown"}
LOCAL = [("Nizersail", "Nizersail", "নাইজারশাইল"), ("Swarna", "Swarna", "স্বর্ণা"), ("Guti Swarna", "Guti Swarna", "গুটি স্বর্ণা"),
         ("Kalijira", "Kalijira", "কালিজিরা"), ("Chinigura", "Chinigura", "চিনিগুঁড়া"), ("Kataribhog", "Kataribhog", "কাটারিভোগ"),
         ("Binni", "Binni (sticky rice)", "বিন্নি"), ("Pajam", "Pajam", "পাজাম")]
BN_DIGITS = "০১২৩৪৫৬৭৮৯"


def bnum(n: int) -> str:
    return "".join(BN_DIGITS[int(c)] for c in str(n))


def varieties() -> list[dict]:
    keep = {}
    for vid, en, bn, typ, season, flag in ORIGINAL_VARIETIES:
        v = {"id": vid, "en": en, "bn": bn, "type": typ}
        if season:
            v["season"] = season
        if flag:
            v["flag"] = flag
        keep[vid] = v
    out: list[dict] = []

    def add(vid: str, en: str, bn: str, typ: str, group: str) -> None:
        if vid in keep:
            out.append({**keep[vid], "group": group})
            return
        v = {"id": vid, "en": en, "bn": bn, "type": typ, "group": group}
        if vid in SALT_VERIFIED:
            v.update(en=en + " (salt-tolerant)", bn=bn + " (লবণ-সহনশীল)", flag="salt")
        out.append(v)

    add("unknown", "", "", "unknown", "unknown")
    for vid in ["BRRI dhan51", "BRRI dhan52", "BRRI dhan79", "BINA dhan11", "BINA dhan12"]:
        add(vid, "", "", "sub1", "flood")
    for n in range(1, 27):
        add(f"BR{n}", f"BR{n}", f"বিআর{bnum(n)}", "conventional", "brri")
    for n in range(27, 106):
        if n not in (51, 52, 79):
            add(f"BRRI dhan{n}", f"BRRI dhan{n}", f"ব্রি ধান{bnum(n)}", "conventional", "brri")
    for n in range(4, 26):
        if n not in (11, 12):
            add(f"BINA dhan{n}", f"BINA dhan{n}", f"বিনা ধান{bnum(n)}", "conventional", "bina")
    for n in range(1, 8):
        add(f"BRRI hybrid dhan{n}", f"BRRI hybrid dhan{n}", f"ব্রি হাইব্রিড ধান{bnum(n)}", "conventional", "hybrid")
    add("hybrid_other", "Other hybrid (any company)", "অন্য হাইব্রিড (যেকোনো কোম্পানি)", "conventional", "hybrid")
    for vid, en, bn in LOCAL:
        add(vid, en, bn, "conventional", "local")
    add("other", "Other variety (not in list)", "অন্য জাত (তালিকায় নেই)", "unknown", "other")
    ids = [v["id"] for v in out]
    assert len(set(ids)) == len(ids) and all(k in ids for k in keep)
    return out


def main() -> None:
    divisions, dists, upas = load("divisions"), load("districts"), load("upazilas")
    div_name = {d["id"]: d["name"] for d in divisions}
    districts, upazilas = [], []
    for d in sorted(dists, key=lambda d: EN_FIX.get(d["name"], d["name"])):
        den = EN_FIX.get(d["name"], d["name"])
        dcode = slug(den)
        north = div_name[d["division_id"]] in NORTH_DIVISIONS
        districts.append({"code": dcode, "en": den, "bn": d["bn_name"], "division": div_name[d["division_id"]], "region": region(d["name"]), "north": north})
        for u in sorted((u for u in upas if u["district_id"] == d["id"]), key=lambda u: u["name"]):
            o = ORIGINAL.get((d["name"], u["name"]))
            if o:
                upazilas.append({**o, "district": dcode, "name_en": o["en"].split(",")[0], "name_bn": o["bn"].split(",")[0]})
            else:
                upazilas.append({
                    "code": f"{dcode}-{slug(u['name'])}", "en": f"{u['name']}, {den}", "bn": f"{u['bn_name']}, {d['bn_name']}",
                    "region": region(d["name"]), "north": north, "district": dcode, "name_en": u["name"], "name_bn": u["bn_name"],
                })
    codes = {u["code"] for u in upazilas}
    assert len(codes) == len(upazilas), "duplicate upazila code"
    assert all(o["code"] in codes for o in ORIGINAL.values()), "lost an original upazila"
    assert all(v in codes for v in ALIASES.values()), "alias target missing"
    V = varieties()
    out = {
        "note": "Upazilas: all 494 from nuhil/bangladesh-geocode (MIT). Zoha's 16 original entries keep their codes/names/tags. "
        "region is APPROXIMATE, by district (haor = 7 haor districts; coastal = 12 exposed-coast districts; barind = Rajshahi, Naogaon, "
        "Chapainawabganj; north = Rajshahi or Rangpur division): check locally. aliases map the placeholder codes from commit fbe7d78. "
        "Varieties: Zoha's 18 kept as-is; BR1-26, BRRI dhan27-105, BINA dhan4-25, BRRI hybrid dhan1-7 added by number (NEEDS-CHECK that "
        "every number exists); tolerance flags only where a source verifies them (Sub1 51/52/79/BINA 11/12; drought 56/71; salt 47/61/67/97/99).",
        "aliases": ALIASES,
        "variety_aliases": VARIETY_ALIASES,
        "districts": districts,
        "upazilas": upazilas,
        "varieties": V,
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(len(districts), "districts |", len(upazilas), "upazilas |", dict(Counter(u["region"] for u in upazilas)))
    print(len(V), "varieties |", dict(Counter(v["group"] for v in V)))


if __name__ == "__main__":
    main()
