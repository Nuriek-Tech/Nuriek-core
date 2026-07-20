import re

with open('app/(portal)/admin/finish-letter/page.tsx', 'r') as f:
    content = f.read()

# Replace the layout
content = content.replace('<div className="olLayout">', '<div className="olFormPanel glass">\n<form className="olFormColumns">')
content = content.replace('<aside className="olSidebar">', '<div className="olFormCol">')
content = content.replace('</aside>', '</div>')
content = content.replace('<main className="olMain">', '')
content = content.replace('</main>', '')
content = content.replace('</div>\n\n            {previewOpen &&', '</form>\n<div className="olActionRow" style={{ marginTop: "2rem" }}>\n<button className="hubBtnPrimary" onClick={preview} disabled={generating}>\n{generating ? <Loader2 size={16} className="animate-spin" /> : <><Eye size={16} /> Preview Letter</>}\n</button>\n</div>\n</div>\n\n{previewOpen &&')

# Remove the inline preview section
preview_section_regex = r'<div className="olPreviewGlass glass">.*?</main>'
content = re.sub(r'<div className="olPreviewGlass glass">.*?<div className="olActionRow">.*?</div>\s*</div>\s*</main>', '', content, flags=re.DOTALL)

# Let's fix the modal footer to include the Send Email button
modal_footer = """                            <div className="olModalBody" style={{ padding: 0 }}>
                                <iframe srcDoc={previewHtml} style={{ width: "100%", height: "100%", border: "none" }} title="Preview" />
                            </div>
                            <footer className="olModalFoot">
                                <button type="button" className="olBtnSecondary" onClick={() => setPreviewOpen(false)}>Close</button>
                                <button type="button" className="admSubmitBtn" onClick={sendEmail} disabled={sendingEmail || previewStale}>
                                    {sendingEmail ? <Loader2 size={16} className="animate-spin" /> : <><Mail size={16} /> Send Email</>}
                                </button>
                            </footer>
"""
content = re.sub(r'<div className="olModalBody".*?</div\s*>\s*</div\s*>\s*</div\s*>', modal_footer + '</div></div>', content, flags=re.DOTALL)

# Fix the columns to put Dates and Signatory in the second column
dates_idx = content.find('<div className="olSection">\n                        <h2 className="olSectionTitle">\n                            <Calendar size={16} /> Dates')
if dates_idx != -1:
    content = content[:dates_idx] + '</div><div className="olFormCol">\n' + content[dates_idx:]

with open('app/(portal)/admin/finish-letter/page.tsx', 'w') as f:
    f.write(content)
