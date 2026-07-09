package work.courtwork.spike;

import org.docx4j.openpackaging.packages.WordprocessingMLPackage;
import org.docx4j.wml.P;
import org.docx4j.TextUtils;

import java.io.File;
import java.io.StringWriter;
import java.util.List;

/** 环境探测：先确认 docx4j 能正常读写样例合同，再上手做 tracked-changes。 */
public class Probe {
    public static void main(String[] args) throws Exception {
        WordprocessingMLPackage pkg = WordprocessingMLPackage.load(new File(args[0]));
        List<Object> paras = pkg.getMainDocumentPart().getContent();
        int count = 0;
        for (Object o : paras) {
            if (o instanceof P) {
                count++;
            }
        }
        System.out.println("top-level paragraphs: " + count);
        System.out.println("first 300 chars of extracted text:");
        StringWriter sw = new StringWriter();
        TextUtils.extractText(pkg.getMainDocumentPart().getJaxbElement(), sw);
        String text = sw.toString();
        System.out.println(text.substring(0, Math.min(300, text.length())));
    }
}
