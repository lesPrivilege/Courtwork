package work.courtwork.spike;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import org.docx4j.openpackaging.packages.WordprocessingMLPackage;
import org.docx4j.openpackaging.parts.WordprocessingML.CommentsPart;
import org.docx4j.openpackaging.parts.WordprocessingML.MainDocumentPart;
import org.docx4j.wml.*;

import jakarta.xml.bind.JAXBElement;
import javax.xml.datatype.DatatypeFactory;
import javax.xml.datatype.XMLGregorianCalendar;
import java.io.File;
import java.io.FileReader;
import java.math.BigInteger;
import java.util.ArrayList;
import java.util.List;

/**
 * docx4j 路径 spike：不走"整篇 diff"，而是逐条指令直接在 OOXML 对象模型里
 * 构造 w:ins/w:del/批注标记 —— 这是 docx4j 的自然用法（它本身不提供 diff
 * 算法），也是与 Python-Redlines 路径做"生成质量/工程复杂度"对比的基准。
 */
public class RedlineSpike {

    static final org.docx4j.wml.ObjectFactory WML =
            new org.docx4j.wml.ObjectFactory();

    static int nextRevId = 1000;
    static int nextCommentId = 0;
    static final String AUTHOR = "Courtwork Spike";
    static final String DATE = "2026-07-09T00:00:00Z";

    static List<Comments.Comment> pendingComments = new ArrayList<>();

    static XMLGregorianCalendar xmlDate() {
        try {
            return DatatypeFactory.newInstance().newXMLGregorianCalendar(DATE);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public static void main(String[] args) throws Exception {
        String fixturesDir = args[0];
        String outDir = args[1];
        new File(outDir).mkdirs();

        Gson gson = new Gson();
        JsonObject root = gson.fromJson(
                new FileReader(fixturesDir + "/instructions.json"), JsonObject.class);
        JsonArray instructions = root.getAsJsonArray("instructions");

        WordprocessingMLPackage pkg =
                WordprocessingMLPackage.load(new File(fixturesDir + "/original.docx"));
        MainDocumentPart mdp = pkg.getMainDocumentPart();

        CommentsPart commentsPart = new CommentsPart();
        Comments commentsModel = WML.createComments();
        commentsPart.setJaxbElement(commentsModel);
        mdp.addTargetPart(commentsPart);

        JsonObject results = new JsonObject();
        for (int i = 0; i < instructions.size(); i++) {
            JsonObject ins = instructions.get(i).getAsJsonObject();
            String id = ins.get("id").getAsString();
            String status;
            try {
                status = applyInstruction(mdp, ins);
            } catch (Exception e) {
                status = "error: " + e;
            }
            results.addProperty(id, status);
            System.out.println(id + " -> " + status);
        }

        commentsModel.getComment().addAll(pendingComments);

        File outFile = new File(outDir, "redline_direct_author.docx");
        pkg.save(outFile);
        System.out.println("saved " + outFile.getAbsolutePath());
    }

    // ---------- 定位辅助 ----------

    static P findParagraphByQuote(MainDocumentPart mdp, String quote) {
        for (Object o : mdp.getContent()) {
            if (o instanceof P) {
                P p = (P) o;
                if (paragraphText(p).contains(quote)) return p;
            }
        }
        return null;
    }

    static String paragraphText(P p) {
        StringBuilder sb = new StringBuilder();
        for (Object c : p.getContent()) {
            collectText(c, sb);
        }
        return sb.toString();
    }

    static void collectText(Object o, StringBuilder sb) {
        if (o instanceof JAXBElement) o = ((JAXBElement<?>) o).getValue();
        if (o instanceof R) {
            for (Object rc : ((R) o).getContent()) {
                Object v = rc instanceof JAXBElement ? ((JAXBElement<?>) rc).getValue() : rc;
                if (v instanceof Text) sb.append(((Text) v).getValue());
            }
        }
    }

    static Tbl findTable(MainDocumentPart mdp) {
        for (Object o : mdp.getContent()) {
            Object v = o instanceof JAXBElement ? ((JAXBElement<?>) o).getValue() : o;
            if (v instanceof Tbl) return (Tbl) v;
        }
        return null;
    }

    static Object unwrap(Object o) {
        return o instanceof JAXBElement ? ((JAXBElement<?>) o).getValue() : o;
    }

    static Tr findRowContaining(Tbl tbl, String needle) {
        for (Object o : tbl.getContent()) {
            Tr tr = (Tr) unwrap(o);
            for (Object cellObj : tr.getContent()) {
                Tc tc = (Tc) unwrap(cellObj);
                for (Object pObj : tc.getContent()) {
                    if (pObj instanceof P && paragraphText((P) pObj).contains(needle)) {
                        return tr;
                    }
                }
            }
        }
        return null;
    }

    // ---------- 指令分发 ----------

    static String applyInstruction(MainDocumentPart mdp, JsonObject ins) {
        String kind = ins.get("kind").getAsString();
        JsonObject locator = ins.getAsJsonObject("locator");
        String annotationText = ins.getAsJsonObject("annotation").get("text").getAsString();

        switch (kind) {
            case "replace": {
                if (locator.has("tableCell")) {
                    JsonObject tc = locator.getAsJsonObject("tableCell");
                    Tbl tbl = findTable(mdp);
                    Tr row = findRowContaining(tbl, tc.get("rowContains").getAsString());
                    if (row == null) return "locator_not_found";
                    int colIdx = columnIndex(tbl, tc.get("columnHeader").getAsString());
                    Tc cell = (Tc) unwrap(row.getContent().get(colIdx));
                    P p = (P) cell.getContent().get(0);
                    String quote = locator.get("quote").getAsString();
                    String replacement = ins.get("replacementText").getAsString();
                    if (!paragraphText(p).contains(quote)) return "locator_text_mismatch";
                    applyMinimalReplace(p, quote, replacement, annotationText);
                    return "applied";
                }
                String quote = locator.get("quote").getAsString();
                P p = findParagraphByQuote(mdp, quote);
                if (p == null) return "locator_not_found";
                String replacement = ins.get("replacementText").getAsString();
                applyMinimalReplace(p, quote, replacement, annotationText);
                return "applied";
            }
            case "insert": {
                String anchorText = locator.get("afterParagraphContaining").getAsString();
                P anchor = findParagraphByQuote(mdp, anchorText);
                if (anchor == null) return "locator_not_found";
                String[] lines = ins.get("insertText").getAsString().split("\n");
                P newP = WML.createP();
                R r = WML.createR();
                Text t = WML.createText();
                t.setValue(String.join(" ", lines));
                t.setSpace("preserve");
                r.getContent().add(WML.createRT(t));
                wrapRunAsIns(newP, r);
                markParagraphMarkIns(newP);
                int idx = mdp.getContent().indexOf(anchor);
                mdp.getContent().add(idx + 1, newP);
                if (!annotationText.isEmpty()) {
                    attachComment(newP, r, annotationText);
                }
                return "applied";
            }
            case "delete": {
                if (locator.has("tableRowContains")) {
                    Tbl tbl = findTable(mdp);
                    Tr row = findRowContaining(tbl, locator.get("tableRowContains").getAsString());
                    if (row == null) return "locator_not_found";
                    markRowDeleted(row);
                    if (!annotationText.isEmpty()) {
                        Tc firstCell = (Tc) unwrap(row.getContent().get(0));
                        attachCommentToWholeParagraph((P) firstCell.getContent().get(0), annotationText);
                    }
                    return "applied";
                }
                String quote = locator.get("quote").getAsString();
                P p = findParagraphByQuote(mdp, quote);
                if (p == null) return "locator_not_found";
                markParagraphDeleted(p);
                if (!annotationText.isEmpty()) {
                    // 删除类批注锚定在整段（此时段落内容已经是 RunDel 包裹）
                    attachCommentToWholeParagraph(p, annotationText);
                }
                return "applied";
            }
            case "comment-only": {
                String quote = locator.get("quote").getAsString();
                P p = findParagraphByQuote(mdp, quote);
                if (p == null) return "locator_not_found";
                attachCommentToWholeParagraph(p, annotationText);
                return "applied";
            }
            default:
                return "unknown_kind";
        }
    }

    static int columnIndex(Tbl tbl, String header) {
        Tr headerRow = (Tr) unwrap(tbl.getContent().get(0));
        List<Object> cells = headerRow.getContent();
        for (int i = 0; i < cells.size(); i++) {
            Tc tc = (Tc) unwrap(cells.get(i));
            P p = (P) tc.getContent().get(0);
            if (paragraphText(p).trim().equals(header)) return i;
        }
        throw new IllegalStateException("column not found: " + header);
    }

    // ---------- 最小化 replace：公共前缀/后缀裁剪，逼近 DocxodusEngine 的细粒度效果 ----------

    static void applyMinimalReplace(P p, String quote, String replacement, String annotationText) {
        String full = paragraphText(p);
        String newFull = full.replace(quote, replacement);

        int prefixLen = 0;
        int maxPrefix = Math.min(full.length(), newFull.length());
        while (prefixLen < maxPrefix && full.charAt(prefixLen) == newFull.charAt(prefixLen)) prefixLen++;

        int suffixLen = 0;
        int maxSuffix = Math.min(full.length(), newFull.length()) - prefixLen;
        while (suffixLen < maxSuffix
                && full.charAt(full.length() - 1 - suffixLen) == newFull.charAt(newFull.length() - 1 - suffixLen)) {
            suffixLen++;
        }

        String prefix = full.substring(0, prefixLen);
        String deleted = full.substring(prefixLen, full.length() - suffixLen);
        String inserted = newFull.substring(prefixLen, newFull.length() - suffixLen);
        String suffix = full.substring(full.length() - suffixLen);

        p.getContent().clear();

        R insertedRun = null;
        if (!prefix.isEmpty()) p.getContent().add(plainRun(prefix));
        if (!deleted.isEmpty()) p.getContent().add(delRun(deleted));
        if (!inserted.isEmpty()) {
            insertedRun = plainRun(inserted);
            p.getContent().add(wrapAsIns(insertedRun));
        }
        if (!suffix.isEmpty()) p.getContent().add(plainRun(suffix));

        if (!annotationText.isEmpty()) {
            // 批注锚定在新插入的内容上（若本次是纯删除没有插入内容，退化为锚在段落末尾）
            R anchorRun = insertedRun != null ? insertedRun : plainRun("");
            if (insertedRun == null) p.getContent().add(anchorRun);
            attachComment(p, anchorRun, annotationText);
        }
    }

    // ---------- run/ins/del 构造 ----------

    static R plainRun(String text) {
        R r = WML.createR();
        Text t = WML.createText();
        t.setValue(text);
        t.setSpace("preserve");
        r.getContent().add(WML.createRT(t));
        return r;
    }

    static RunDel delRun(String text) {
        RunDel del = WML.createRunDel();
        del.setId(BigInteger.valueOf(nextRevId++));
        del.setAuthor(AUTHOR);
        del.setDate(xmlDate());
        R r = WML.createR();
        DelText dt = WML.createDelText();
        dt.setValue(text);
        dt.setSpace("preserve");
        r.getContent().add(dt);
        del.getCustomXmlOrSmartTagOrSdt().add(r);
        return del;
    }

    static RunIns wrapAsIns(R r) {
        RunIns ins = WML.createRunIns();
        ins.setId(BigInteger.valueOf(nextRevId++));
        ins.setAuthor(AUTHOR);
        ins.setDate(xmlDate());
        ins.getCustomXmlOrSmartTagOrSdt().add(r);
        return ins;
    }

    static void wrapRunAsIns(P p, R r) {
        p.getContent().add(wrapAsIns(r));
    }

    static void markParagraphMarkIns(P p) {
        PPr ppr = p.getPPr();
        if (ppr == null) { ppr = WML.createPPr(); p.setPPr(ppr); }
        ParaRPr rpr = ppr.getRPr();
        if (rpr == null) { rpr = WML.createParaRPr(); ppr.setRPr(rpr); }
        CTTrackChange ins = WML.createCTTrackChange();
        ins.setId(BigInteger.valueOf(nextRevId++));
        ins.setAuthor(AUTHOR);
        ins.setDate(xmlDate());
        rpr.setIns(ins);
    }

    static void markParagraphDeleted(P p) {
        List<Object> old = new ArrayList<>(p.getContent());
        p.getContent().clear();
        for (Object o : old) {
            if (o instanceof R) {
                R r = (R) o;
                RunDel del = delRunFromExistingRun(r);
                p.getContent().add(del);
            } else {
                p.getContent().add(o);
            }
        }
        PPr ppr = p.getPPr();
        if (ppr == null) { ppr = WML.createPPr(); p.setPPr(ppr); }
        ParaRPr rpr = ppr.getRPr();
        if (rpr == null) { rpr = WML.createParaRPr(); ppr.setRPr(rpr); }
        CTTrackChange del = WML.createCTTrackChange();
        del.setId(BigInteger.valueOf(nextRevId++));
        del.setAuthor(AUTHOR);
        del.setDate(xmlDate());
        rpr.setDel(del);
    }

    static RunDel delRunFromExistingRun(R original) {
        RunDel del = WML.createRunDel();
        del.setId(BigInteger.valueOf(nextRevId++));
        del.setAuthor(AUTHOR);
        del.setDate(xmlDate());
        R r = WML.createR();
        r.setRPr(original.getRPr());
        for (Object c : original.getContent()) {
            Object v = c instanceof JAXBElement ? ((JAXBElement<?>) c).getValue() : c;
            if (v instanceof Text) {
                DelText dt = WML.createDelText();
                dt.setValue(((Text) v).getValue());
                dt.setSpace("preserve");
                r.getContent().add(dt);
            }
        }
        del.getCustomXmlOrSmartTagOrSdt().add(r);
        return del;
    }

    static void markRowDeleted(Tr row) {
        TrPr trPr = row.getTrPr();
        if (trPr == null) { trPr = WML.createTrPr(); row.setTrPr(trPr); }
        CTTrackChange del = WML.createCTTrackChange();
        del.setId(BigInteger.valueOf(nextRevId++));
        del.setAuthor(AUTHOR);
        del.setDate(xmlDate());
        trPr.setDel(del);

        for (Object cellObj : row.getContent()) {
            Tc tc = (Tc) unwrap(cellObj);
            for (Object pObj : tc.getContent()) {
                if (pObj instanceof P) markParagraphDeleted((P) pObj);
            }
        }
    }

    // ---------- 批注 ----------

    static void attachComment(P p, R anchorRun, String text) {
        int cid = nextCommentId++;
        CommentRangeStart start = WML.createCommentRangeStart();
        start.setId(BigInteger.valueOf(cid));
        CommentRangeEnd end = WML.createCommentRangeEnd();
        end.setId(BigInteger.valueOf(cid));
        R refRun = WML.createR();
        R.CommentReference ref = WML.createRCommentReference();
        ref.setId(BigInteger.valueOf(cid));
        refRun.getContent().add(WML.createRCommentReference(ref));

        // anchorRun 可能是被 RunIns 包裹的 R，也可能是裸 R——找它在段落内容里的直接子元素位置
        Object container = findDirectChild(p.getContent(), anchorRun);
        int idx = p.getContent().indexOf(container);
        p.getContent().add(idx, start);
        p.getContent().add(idx + 2, end);
        p.getContent().add(idx + 3, refRun);

        pendingComments.add(buildComment(cid, text));
    }

    static void attachCommentToWholeParagraph(P p, String text) {
        int cid = nextCommentId++;
        CommentRangeStart start = WML.createCommentRangeStart();
        start.setId(BigInteger.valueOf(cid));
        CommentRangeEnd end = WML.createCommentRangeEnd();
        end.setId(BigInteger.valueOf(cid));
        R refRun = WML.createR();
        R.CommentReference ref = WML.createRCommentReference();
        ref.setId(BigInteger.valueOf(cid));
        refRun.getContent().add(WML.createRCommentReference(ref));

        p.getContent().add(0, start);
        p.getContent().add(end);
        p.getContent().add(refRun);

        pendingComments.add(buildComment(cid, text));
    }

    static Object findDirectChild(List<Object> siblings, R target) {
        for (Object o : siblings) {
            if (o == target) return o;
            if (o instanceof RunIns && ((RunIns) o).getCustomXmlOrSmartTagOrSdt().contains(target)) return o;
            if (o instanceof RunDel && ((RunDel) o).getCustomXmlOrSmartTagOrSdt().contains(target)) return o;
        }
        return target;
    }

    static Comments.Comment buildComment(int id, String text) {
        Comments.Comment c = WML.createCommentsComment();
        c.setId(BigInteger.valueOf(id));
        c.setAuthor(AUTHOR);
        c.setInitials("CW");
        c.setDate(xmlDate());
        P p = WML.createP();
        p.getContent().add(plainRun(text));
        c.getContent().add(p);
        return c;
    }
}
