from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("matches", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="match",
            name="referee_name",
            field=models.CharField(blank=True, max_length=160),
        ),
    ]
