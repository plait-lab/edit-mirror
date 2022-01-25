echo 'Have you signed and returned the consent form for this study?'
select consent in 'Yes' 'No'; do
  case $consent in
    Yes) break;;
    No) echo "Exiting without enabling Edit Mirror for current project"; exit;;
  esac
done

echo 'Do you want to enable Edit Mirror for the current project?'
select enabled in 'Yes' 'No'; do
  case $enabled in
    Yes) break;;
    No) echo "Exiting without enabling Edit Mirror for current project"; exit;;
  esac
done

echo 'Initializing Edit Mirror for current project...'

plugin_dir=___edit-mirror___

mkdir $plugin_dir
echo "/*" > $plugin_dir/.gitignore

mkdir $plugin_dir/log
mkdir $plugin_dir/metadata

echo "0" > $plugin_dir/metadata/last-upload-request.txt
touch $plugin_dir/metadata/plugin-log.txt

echo "Edit Mirror initialization successfully completed for current project"
